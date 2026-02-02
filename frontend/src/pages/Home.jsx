import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { campaignAPI } from '../services/api';
import './Home.css';

function Home() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await campaignAPI.getAll({ limit: 6 });
      setCampaigns(response.data.data.campaigns || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <div className="hero">
        <div className="container">
          <h1>Make a Difference Today</h1>
          <p>Support causes that matter. Every donation counts.</p>
          <Link to="/campaigns" className="btn btn-primary">
            Browse Campaigns
          </Link>
        </div>
      </div>

      <div className="container">
        <h2>Featured Campaigns</h2>
        {loading ? (
          <p>Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <p>No campaigns available. <Link to="/campaigns">Create one</Link></p>
        ) : (
          <div className="campaign-grid">
            {campaigns.map((campaign) => (
              <div key={campaign._id || campaign.id} className="campaign-card">
                <h3>{campaign.title}</h3>
                <p className="description">{campaign.description?.substring(0, 100)}...</p>
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
                    ${campaign.currentAmount || campaign.totals?.totalRaised || 0} of ${campaign.goalAmount}
                  </div>
                </div>
                <Link to={`/campaigns/${campaign._id || campaign.id}`} className="btn btn-primary">
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;

