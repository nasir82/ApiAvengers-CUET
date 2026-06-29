const Pledge = require('../Pledge');

describe('Pledge model validation', () => {
  const base = { campaignId: 'c1', amount: 50, idempotencyKey: 'k1' };

  it('accepts a valid pledge; status defaults to PENDING and is not anonymous', () => {
    const p = new Pledge(base);
    expect(p.validateSync()).toBeUndefined();
    expect(p.status).toBe('PENDING');
    expect(p.anonymous).toBe(false);
  });

  it('allows an anonymous pledge with no userId (unregistered donor)', () => {
    const p = new Pledge({ ...base, anonymous: true });
    expect(p.validateSync()).toBeUndefined();
    expect(p.userId).toBeUndefined();
  });

  it('accepts an optional donorReference for guest history lookup', () => {
    const p = new Pledge({ ...base, donorReference: 'guest@example.com' });
    expect(p.validateSync()).toBeUndefined();
    expect(p.donorReference).toBe('guest@example.com');
  });

  it('requires campaignId, amount and idempotencyKey', () => {
    const err = new Pledge({}).validateSync();
    expect(err.errors.campaignId).toBeDefined();
    expect(err.errors.amount).toBeDefined();
    expect(err.errors.idempotencyKey).toBeDefined();
  });

  it('rejects a negative amount and an invalid status', () => {
    expect(new Pledge({ ...base, amount: -1 }).validateSync().errors.amount).toBeDefined();
    expect(new Pledge({ ...base, status: 'NOPE' }).validateSync().errors.status).toBeDefined();
  });
});
