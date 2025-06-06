const EmailService = require('./EmailService');
const { MockProviderA, MockProviderB } = require('./MockProviders');

(async () => {
  const providers = [new MockProviderA(), new MockProviderB()];
  const emailService = new EmailService(providers, { maxRetries: 3, rateLimit: 5 });

  // Listen for status events
  emailService.on('status', (status) => {
    console.log('Status update:', status);
  });

  const emails = [
    { id: 'email-001', to: 'a@example.com', subject: 'Hello A', body: 'Test email A' },
    { id: 'email-002', to: 'b@example.com', subject: 'Hello B', body: 'Test email B' },
    { id: 'email-003', to: 'c@example.com', subject: 'Hello C', body: 'Test email C' },
  ];

  for (const email of emails) {
    try {
      const res = await emailService.sendEmail(email);
      console.log(`Email ${email.id} send result:`, res);
    } catch (err) {
      console.error(`Failed to send email ${email.id}:`, err.message);
    }
  }
})();
