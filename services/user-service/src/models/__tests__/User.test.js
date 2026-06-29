const User = require('../User');

describe('User model validation', () => {
  const base = { email: 'a@b.com', password: 'hashed', name: 'Abir' };

  it('accepts a valid user; role defaults to USER', () => {
    const u = new User(base);
    expect(u.validateSync()).toBeUndefined();
    expect(u.role).toBe('USER');
    expect(u.totalDonated).toBe(0);
  });

  it('lowercases the email', () => {
    expect(new User({ ...base, email: 'ABIR@CUET.AC' }).email).toBe('abir@cuet.ac');
  });

  it('requires email, password and name', () => {
    const err = new User({}).validateSync();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
    expect(err.errors.name).toBeDefined();
  });

  it('only allows USER or ADMIN role', () => {
    expect(new User({ ...base, role: 'SUPERADMIN' }).validateSync().errors.role).toBeDefined();
    expect(new User({ ...base, role: 'ADMIN' }).validateSync()).toBeUndefined();
  });
});
