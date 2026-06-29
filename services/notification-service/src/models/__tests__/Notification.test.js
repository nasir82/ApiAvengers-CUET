const Notification = require('../Notification');

describe('Notification model validation', () => {
  const base = { type: 'PLEDGE_CONFIRMED', title: 'Pledge Created', message: 'Thanks!' };

  it('accepts a valid notification; defaults read to false', () => {
    const n = new Notification(base);
    expect(n.validateSync()).toBeUndefined();
    expect(n.read).toBe(false);
  });

  it('requires type, title and message', () => {
    const err = new Notification({}).validateSync();
    expect(err.errors.type).toBeDefined();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.message).toBeDefined();
  });

  it('only allows known notification types', () => {
    expect(new Notification({ ...base, type: 'SPAM' }).validateSync().errors.type).toBeDefined();
    expect(new Notification({ ...base, type: 'PAYMENT_COMPLETED' }).validateSync()).toBeUndefined();
  });
});
