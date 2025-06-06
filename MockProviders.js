class MockProviderA {
  constructor() {
    this.name = 'MockProviderA';
    this.failureRate = 0.3; // 30% fail
  }

  async send(email) {
    if (Math.random() < this.failureRate) {
      throw new Error('MockProviderA failed');
    }
    // Simulate network latency
    await new Promise(res => setTimeout(res, 100));
  }
}

class MockProviderB {
  constructor() {
    this.name = 'MockProviderB';
    this.failureRate = 0.2; // 20% fail
  }

  async send(email) {
    if (Math.random() < this.failureRate) {
      throw new Error('MockProviderB failed');
    }
    await new Promise(res => setTimeout(res, 100));
  }
}

module.exports = { MockProviderA, MockProviderB };
