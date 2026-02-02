import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { campaignAPI } from '../services/api';
import './CampaignDetail.css';

function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    try {
      const response = await campaignAPI.getById(id);
      setCampaign(response.data.data.campaign || response.data.data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (!campaign) return <div className="container"><p>Campaign not found</p></div>;

  const progress = ((campaign.currentAmount || campaign.totals?.totalRaised || 0) / campaign.goalAmount) * 100;

  return (
    <div className="container">
      <div className="campaign-detail">
        {campaign.imageUrl && (
          <img src={campaign.imageUrl} alt={campaign.title} className="campaign-detail-image" />
        )}
        <h1>{campaign.title}</h1>
        <div className="campaign-meta">
          <span className="category">{campaign.category}</span>
          <span className="status">{campaign.status}</span>
        </div>
        <p className="description">{campaign.description}</p>
        
        <div className="progress-section">
          <div className="progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
            </div>
          </div>
          <div className="progress-stats">
            <div>
              <strong>${campaign.currentAmount || campaign.totals?.totalRaised || 0}</strong>
              <span>Raised</span>
            </div>
            <div>
              <strong>${campaign.goalAmount}</strong>
              <span>Goal</span>
            </div>
            <div>
              <strong>{campaign.totals?.totalPledges || 0}</strong>
              <span>Donations</span>
            </div>
          </div>
        </div>

        <div className="actions">
          <Link to={`/campaigns/${id}/donate`} className="btn btn-primary btn-large">
            Donate Now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CampaignDetail;

