import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import './AdminDashboard.css';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStats();
      setStats(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load statistics');
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <h1>Admin Dashboard</h1>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <h1>Admin Dashboard</h1>
          <div className="error-message">{error}</div>
          <button onClick={loadStats} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        <h1>Admin Dashboard</h1>
        <p className="subtitle">Platform Statistics and Analytics</p>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Campaigns</h3>
            <p className="stat-value">{stats?.totalCampaigns || 0}</p>
          </div>

          <div className="stat-card">
            <h3>Total Pledges</h3>
            <p className="stat-value">{stats?.totalPledges || 0}</p>
          </div>

          <div className="stat-card">
            <h3>Total Donations</h3>
            <p className="stat-value">${stats?.totalDonations || 0}</p>
          </div>

          <div className="stat-card">
            <h3>Total Users</h3>
            <p className="stat-value">{stats?.totalUsers || 0}</p>
          </div>

          <div className="stat-card">
            <h3>Active Campaigns</h3>
            <p className="stat-value">{stats?.activeCampaigns || 0}</p>
          </div>

          <div className="stat-card">
            <h3>Completed Campaigns</h3>
            <p className="stat-value">{stats?.completedCampaigns || 0}</p>
          </div>
        </div>

        <div className="refresh-section">
          <button onClick={loadStats} className="btn btn-primary">
            Refresh Statistics
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

