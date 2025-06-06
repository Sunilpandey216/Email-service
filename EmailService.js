const EventEmitter = require('events');

class CircuitBreaker {
  constructor(failureThreshold = 3, cooldownTime = 10000) {
    this.failureThreshold = failureThreshold;
    this.cooldownTime = cooldownTime;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  canRequest() {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  success() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  failure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.cooldownTime;
    }
  }
}

class EmailService extends EventEmitter {
  constructor(providers, options = {}) {
    super();
    this.providers = providers.map(p => ({
      instance: p,
      circuitBreaker: new CircuitBreaker(),
    }));

    this.maxRetries = options.maxRetries || 3;
    this.rateLimit = options.rateLimit || 5; // per minute
    this.sentEmailIds = new Set();

    this.sendCount = 0;
    this.resetTime = Date.now() + 60000;

    this.queue = [];
    this.isProcessingQueue = false;
  }

  async sendEmail(email) {
    return new Promise((resolve, reject) => {
      this.queue.push({ email, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const { email, resolve, reject } = this.queue[0];

      try {
        const result = await this._sendEmailInternal(email);
        resolve(result);
      } catch (err) {
        reject(err);
      }

      this.queue.shift();
    }

    this.isProcessingQueue = false;
  }

  async _sendEmailInternal(email) {
    // Idempotency
    if (this.sentEmailIds.has(email.id)) {
      this._log('info', `Email ${email.id} already sent.`);
      return { status: 'already_sent' };
    }

    // Rate limit reset
    if (Date.now() > this.resetTime) {
      this.sendCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    if (this.sendCount >= this.rateLimit) {
      this._log('warn', 'Rate limit exceeded');
      throw new Error('Rate limit exceeded');
    }

    for (const providerObj of this.providers) {
      const { instance, circuitBreaker } = providerObj;

      if (!circuitBreaker.canRequest()) {
        this._log('warn', `${instance.name} circuit breaker open, skipping provider`);
        continue; // Skip this provider
      }

      try {
        await this._trySendWithRetries(instance, email);
        circuitBreaker.success();
        this.sentEmailIds.add(email.id);
        this.sendCount++;

        this._log('info', `Email ${email.id} sent successfully via ${instance.name}`);
        this.emit('status', { emailId: email.id, status: 'sent', provider: instance.name });

        return { status: 'sent', provider: instance.name };
      } catch (err) {
        circuitBreaker.failure();
        this._log('error', `${instance.name} failed to send email ${email.id}: ${err.message}`);
      }
    }

    this._log('error', `All providers failed for email ${email.id}`);
    this.emit('status', { emailId: email.id, status: 'failed' });

    return { status: 'failed', error: 'All providers failed' };
  }

  async _trySendWithRetries(provider, email) {
    let attempt = 0;
    let delay = 100;

    while (attempt < this.maxRetries) {
      try {
        await provider.send(email);
        return;
      } catch (err) {
        attempt++;
        if (attempt >= this.maxRetries) throw err;
        await this._delay(delay);
        delay *= 2;
      }
    }
  }

  _delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  _log(level, message) {
    console[level](`[${new Date().toISOString()}][${level.toUpperCase()}] ${message}`);
  }
}

module.exports = EmailService;
