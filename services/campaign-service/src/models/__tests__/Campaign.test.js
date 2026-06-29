const Campaign = require('../Campaign');

describe('Campaign model validation', () => {
  const base = { title: 'Help', description: 'desc', goalAmount: 1000, createdBy: 'u1' };

  it('accepts a valid campaign; status defaults to ACTIVE', () => {
    const c = new Campaign(base);
    expect(c.validateSync()).toBeUndefined();
    expect(c.status).toBe('ACTIVE');
  });

  it('requires the core fields', () => {
    const err = new Campaign({}).validateSync();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.createdBy).toBeDefined();
  });

  it('only allows ACTIVE, COMPLETED or CANCELLED status', () => {
    expect(new Campaign({ ...base, status: 'PAUSED' }).validateSync().errors.status).toBeDefined();
    expect(new Campaign({ ...base, status: 'COMPLETED' }).validateSync()).toBeUndefined();
  });
});
