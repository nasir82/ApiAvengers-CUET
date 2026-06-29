// Mock mongoose so the route can be tested with no real database.
jest.mock('mongoose', () => {
  const collection = {
    countDocuments: jest.fn().mockResolvedValue(3),
    aggregate: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([{ _id: null, total: 250 }])
    })
  };
  const db = { collection: jest.fn().mockReturnValue(collection) };
  return { connection: { useDb: jest.fn().mockReturnValue(db) } };
});

const express = require('express');
const request = require('supertest');
const adminRoutes = require('../admin');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('GET /api/admin/stats', () => {
  it('returns aggregated platform statistics', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      totalCampaigns: 3,
      totalUsers: 3,
      totalPledges: 3,
      totalDonations: 250
    });
  });
});
