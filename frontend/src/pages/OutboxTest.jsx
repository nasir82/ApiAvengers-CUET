import { useState } from 'react';
import { pledgeAPI } from '../services/api';
import './TestPages.css';

function OutboxTest() {
  const [campaignId, setCampaignId] = useState('');
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState(75);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runTest = async () => {
    if (!campaignId || !userId) {
      setError('Please enter Campaign ID and User ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const requestBody = {
      campaignId,
      userId,
      amount,
      idempotencyKey: `outbox-test-${Date.now()}`,
    };

    try {
      const startTime = Date.now();
      const response = await pledgeAPI.create(requestBody);
      const time = Date.now() - startTime;

      setResult({
        pledge: response.data.data.pledge || response.data.data,
        status: response.status,
        time,
        message: 'Pledge created with outbox event. Check RabbitMQ to see the event in the queue.',
      });

      // Wait a bit for outbox worker to process
      setTimeout(() => {
        setResult((prev) => ({
          ...prev,
          message: 'Outbox event should now be in RabbitMQ queue. Check http://localhost:15672',
        }));
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Test failed');
      console.error('Test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="test-page">
      <div className="container">
        <h1>Transactional Outbox Pattern Test</h1>
        <p className="subtitle">
          Test that events are stored atomically with the pledge in a transaction
        </p>

        <div className="test-form">
          <div className="form-group">
            <label>Campaign ID *</label>
            <input
              type="text"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="Enter campaign ID"
            />
          </div>

          <div className="form-group">
            <label>User ID *</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
            />
          </div>

          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              min="1"
            />
          </div>

          <button
            onClick={runTest}
            className="btn btn-primary"
            disabled={loading || !campaignId || !userId}
          >
            {loading ? 'Creating Pledge...' : 'Create Pledge with Outbox Event'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {result && (
          <div className="test-results success">
            <h2>Test Results</h2>
            <div className="result-item">
              <strong>Pledge ID:</strong> {result.pledge._id}
            </div>
            <div className="result-item">
              <strong>Status Code:</strong> {result.status}
            </div>
            <div className="result-item">
              <strong>Response Time:</strong> {result.time}ms
            </div>
            <div className="result-item">
              <strong>Amount:</strong> ${result.pledge.amount}
            </div>

            <div className="result-info">
              <h3>How It Works</h3>
              <ol>
                <li>Pledge is created in MongoDB</li>
                <li>Outbox event is created in the SAME transaction</li>
                <li>Transaction is committed atomically</li>
                <li>Background worker picks up the outbox event</li>
                <li>Event is published to RabbitMQ</li>
              </ol>

              <div className="verification-box">
                <h4>Verification Steps:</h4>
                <p>1. Open RabbitMQ Management: <a href="http://localhost:15672" target="_blank" rel="noopener noreferrer">http://localhost:15672</a></p>
                <p>2. Login: admin / admin123</p>
                <p>3. Go to Queues → campaign-service-events</p>
                <p>4. You should see the event message</p>
              </div>

              <p className="info-message">{result.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OutboxTest;

