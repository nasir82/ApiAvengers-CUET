import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { campaignAPI } from '../services/api';
import './Campaigns.css';

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '' });

  useEffect(() => {
    loadCampaigns();
  }, [filters]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      
      const response = await campaignAPI.getAll(params);
      setCampaigns(response.data.data.campaigns || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="campaigns-header">
        <h1>All Campaigns</h1>
        <Link to="/campaigns/create" className="btn btn-primary">
          Create Campaign
        </Link>
      </div>
      
      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
        
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          <option value="MEDICAL">Medical</option>
          <option value="EDUCATION">Education</option>
          <option value="DISASTER">Disaster</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {loading ? (
        <p>Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <p>No campaigns found.</p>
      ) : (
        <div className="campaign-grid">
          {campaigns.map((campaign) => (
            <div key={campaign._id || campaign.id} className="campaign-card">
              {campaign.imageUrl && (
                <img src={campaign.imageUrl} alt={campaign.title} className="campaign-image" />
              )}
              <h3>{campaign.title}</h3>
              <p className="description">{campaign.description?.substring(0, 150)}...</p>
              <div className="campaign-meta">
                <span className="category">{campaign.category}</span>
                <span className="status">{campaign.status}</span>
              </div>
              <div className="progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(
                        ((campaign.currentAmount || campaign.totals?.totalRaised || 0) /
                          campaign.goalAmount) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
                <div className="progress-text">
                  ${campaign.currentAmount || campaign.totals?.totalRaised || 0} raised of ${campaign.goalAmount} goal
                </div>
              </div>
              <Link to={`/campaigns/${campaign._id || campaign.id}`} className="btn btn-primary">
                View & Donate
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Campaigns;

