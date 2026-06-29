const Payment = require('../Payment');

// Schema-level validation runs offline (no DB connection required).
describe('Payment model validation', () => {
  const base = { pledgeId: 'p1', amount: 100, paymentProvider: 'STRIPE', idempotencyKey: 'k1' };

  it('accepts a valid payment and defaults status to INITIATED', () => {
    const err = new Payment(base).validateSync();
    expect(err).toBeUndefined();
    expect(new Payment(base).status).toBe('INITIATED');
  });

  it('requires pledgeId, amount, paymentProvider and idempotencyKey', () => {
    const err = new Payment({}).validateSync();
    expect(err.errors.pledgeId).toBeDefined();
    expect(err.errors.amount).toBeDefined();
    expect(err.errors.paymentProvider).toBeDefined();
    expect(err.errors.idempotencyKey).toBeDefined();
  });

  it('rejects a negative amount', () => {
    const err = new Payment({ ...base, amount: -5 }).validateSync();
    expect(err.errors.amount).toBeDefined();
  });

  it('rejects an invalid status and an invalid provider', () => {
    expect(new Payment({ ...base, status: 'WEIRD' }).validateSync().errors.status).toBeDefined();
    expect(new Payment({ ...base, paymentProvider: 'BITCOIN' }).validateSync().errors.paymentProvider).toBeDefined();
  });
});
