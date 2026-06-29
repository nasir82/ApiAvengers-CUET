const Outbox = require('../Outbox');

describe('Outbox model validation', () => {
  const base = { eventType: 'pledge.created', aggregateId: 'a1', payload: { foo: 'bar' } };

  it('accepts a valid outbox row; status PENDING, retryCount 0 by default', () => {
    const o = new Outbox(base);
    expect(o.validateSync()).toBeUndefined();
    expect(o.status).toBe('PENDING');
    expect(o.retryCount).toBe(0);
    expect(o.aggregateType).toBe('Pledge');
  });

  it('requires eventType, aggregateId and payload', () => {
    const err = new Outbox({}).validateSync();
    expect(err.errors.eventType).toBeDefined();
    expect(err.errors.aggregateId).toBeDefined();
    expect(err.errors.payload).toBeDefined();
  });

  it('only allows PENDING, PUBLISHED or FAILED status', () => {
    expect(new Outbox({ ...base, status: 'SENT' }).validateSync().errors.status).toBeDefined();
    expect(new Outbox({ ...base, status: 'PUBLISHED' }).validateSync()).toBeUndefined();
  });
});
