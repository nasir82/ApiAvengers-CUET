import { useState } from 'react';
import { pledgeAPI } from '../services/api';
import './TestPages.css';

function IdempotencyTest() {
  const [campaignId, setCampaignId] = useState('');
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const generateIdempotencyKey = () => {
    return `idempotency-test-${Date.now()}`;
  };

  const runTest = async () => {
    if (!campaignId || !userId) {
      setError('Please enter Campaign ID and User ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const idempotencyKey = generateIdempotencyKey();
    const requestBody = {
      campaignId,
      userId,
      amount,
      idempotencyKey,
    };

    try {
      // First request
      const startTime1 = Date.now();
      const response1 = await pledgeAPI.create(requestBody);
      const time1 = Date.now() - startTime1;
      const pledgeId1 = response1.data.data.pledge?._id || response1.data.data._id;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Second request (duplicate)
      const startTime2 = Date.now();
      const response2 = await pledgeAPI.create(requestBody);
      const time2 = Date.now() - startTime2;
      const pledgeId2 = response2.data.data.pledge?._id || response2.data.data._id;

      const isSame = pledgeId1 === pledgeId2;

      setResults({
        idempotencyKey,
        firstRequest: {
          id: pledgeId1,
          status: response1.status,
          time: time1,
          response: response1.data,
        },
        secondRequest: {
          id: pledgeId2,
          status: response2.status,
          time: time2,
          response: response2.data,
        },
        isSame,
        success: isSame,
      });
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
        <h1>Idempotency Pattern Test</h1>
        <p className="subtitle">
          Test that duplicate requests with the same idempotency key return the same result
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
            {loading ? 'Running Test...' : 'Run Idempotency Test'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {results && (
          <div className={`test-results ${results.success ? 'success' : 'failure'}`}>
            <h2>Test Results</h2>
            <div className="result-item">
              <strong>Idempotency Key:</strong> {results.idempotencyKey}
            </div>

            <div className="result-comparison">
              <div className="result-box">
                <h3>First Request</h3>
                <p><strong>Pledge ID:</strong> {results.firstRequest.id}</p>
                <p><strong>Status:</strong> {results.firstRequest.status}</p>
                <p><strong>Time:</strong> {results.firstRequest.time}ms</p>
              </div>

              <div className="result-box">
                <h3>Second Request (Duplicate)</h3>
                <p><strong>Pledge ID:</strong> {results.secondRequest.id}</p>
                <p><strong>Status:</strong> {results.secondRequest.status}</p>
                <p><strong>Time:</strong> {results.secondRequest.time}ms</p>
              </div>
            </div>

            <div className="result-verification">
              <h3>Verification</h3>
              <p className={results.success ? 'success-text' : 'failure-text'}>
                {results.success
                  ? '✓ SUCCESS: Both requests returned the same ID. Idempotency is working!'
                  : '✗ FAILED: Different IDs returned. Idempotency not working.'}
              </p>
              <p>
                <strong>Same ID:</strong> {results.isSame ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IdempotencyTest;

