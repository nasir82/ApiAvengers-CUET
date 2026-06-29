import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignAPI, pledgeAPI, paymentAPI } from '../services/api';
import './Donate.css';

function Donate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    message: '',
    anonymous: false,
    donorReference: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState(null);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    try {
      const response = await campaignAPI.getById(id);
      setCampaign(response.data.data.campaign || response.data.data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
    }
  };

  const generateIdempotencyKey = (campaignId, userId, amount) => {
    // Generate key based on form data + session
    // Same form data + same session = same key (for duplicate clicks/retries)
    const sessionKey = `donation-${campaignId}`;
    let sessionId = sessionStorage.getItem(sessionKey);
    
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(sessionKey, sessionId);
    }
    
    // Key format: operation-campaign-user-amount-session
    return `pledge-${campaignId}-${userId || 'anonymous'}-${amount}-${sessionId}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');

      // Generate the keys into LOCAL variables so they are available on the very
      // first click (React state updates are async and would still be null here).
      // Reuse the existing state value on a retry so duplicate clicks share a key.
      const pledgeKey = idempotencyKey || generateIdempotencyKey(id, user?.id, parseFloat(formData.amount));
      const payKey = paymentIdempotencyKey || `payment-${pledgeKey}`;
      if (!idempotencyKey) setIdempotencyKey(pledgeKey);
      if (!paymentIdempotencyKey) setPaymentIdempotencyKey(payKey);

      // Step 1: Create pledge (uses SAME key for retries)
      const pledgeResponse = await pledgeAPI.create({
        campaignId: id,
        amount: parseFloat(formData.amount),
        idempotencyKey: pledgeKey, // SAME key for duplicate clicks
        userId: user?.id || null,
        anonymous: formData.anonymous,
        message: formData.message,
        // Lets unregistered donors look up their history later (e.g. by email)
        donorReference: formData.donorReference || null,
      });

      const pledgeId = pledgeResponse.data.data.pledge._id || pledgeResponse.data.data.pledge.id;

      // Step 2: Process payment (uses SAME key for retries)
      await paymentAPI.create({
        pledgeId,
        amount: parseFloat(formData.amount),
        idempotencyKey: payKey, // SAME key for duplicate clicks
        paymentMethod: 'STRIPE',
      });

      // Success - clear session for this campaign
      sessionStorage.removeItem(`donation-${id}`);
      
      setSuccess('Donation successful! Thank you for your contribution.');
      setTimeout(() => {
        navigate(`/campaigns/${id}`);
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to process donation');
    } finally {
      setLoading(false);
    }
  };

  if (!campaign) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <div className="donate-page">
        <h1>Donate to {campaign.title}</h1>
        
        <form onSubmit={handleSubmit} className="donate-form">
          <div className="form-group">
            <label>Amount ($)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Message (Optional)</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Leave a message of support..."
            />
          </div>

          <div className="form-group">
            <label>Email / reference (optional — track your donation as a guest)</label>
            <input
              type="text"
              value={formData.donorReference}
              onChange={(e) => setFormData({ ...formData, donorReference: e.target.value })}
              placeholder="e.g. your email"
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.anonymous}
                onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
              />
              Donate anonymously
            </label>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'Processing...' : 'Donate Now'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Donate;

