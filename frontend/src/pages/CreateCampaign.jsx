import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../services/api';
import './CreateCampaign.css';

function CreateCampaign() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goalAmount: '',
    category: 'MEDICAL',
    createdBy: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await campaignAPI.create({
        ...formData,
        goalAmount: parseFloat(formData.goalAmount),
      });
      setSuccess(true);
      setTimeout(() => {
        navigate(`/campaigns/${response.data.data.campaign._id}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-campaign">
      <div className="container">
        <h1>Create New Campaign</h1>
        <p className="subtitle">Start a fundraising campaign to help those in need</p>

        {success && (
          <div className="success-message">
            Campaign created successfully! Redirecting...
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="campaign-form">
          <div className="form-group">
            <label htmlFor="title">Campaign Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter campaign title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="5"
              placeholder="Describe your campaign"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="goalAmount">Goal Amount ($) *</label>
              <input
                type="number"
                id="goalAmount"
                name="goalAmount"
                value={formData.goalAmount}
                onChange={handleChange}
                required
                min="1"
                step="0.01"
                placeholder="1000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="MEDICAL">Medical</option>
                <option value="EDUCATION">Education</option>
                <option value="DISASTER">Disaster Relief</option>
                <option value="ANIMAL">Animal Welfare</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="createdBy">Creator User ID *</label>
            <input
              type="text"
              id="createdBy"
              name="createdBy"
              value={formData.createdBy}
              onChange={handleChange}
              required
              placeholder="Enter your user ID"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/campaigns')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateCampaign;

