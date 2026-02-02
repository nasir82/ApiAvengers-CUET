import { useState } from 'react';
import { campaignAPI, pledgeAPI } from '../services/api';
import './TestPages.css';

function CQRSTest() {
  const [campaignId, setCampaignId] = useState('');
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState(25);
  const [numPledges, setNumPledges] = useState(3);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runTest = async () => {
    if (!campaignId || !userId) {
      setError('Please enter Campaign ID and User ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Get initial campaign totals
      const initialResponse = await campaignAPI.getById(campaignId);
      const initialTotals = initialResponse.data.data.totals || {
        totalRaised: 0,
        totalPledges: 0,
        averagePledge: 0,
      };

      // Create multiple pledges
      const createdPledges = [];
      for (let i = 0; i < numPledges; i++) {
        const pledgeBody = {
          campaignId,
          userId,
          amount,
          idempotencyKey: `cqrs-test-${i}-${Date.now()}`,
        };
        const response = await pledgeAPI.create(pledgeBody);
        createdPledges.push(response.data.data.pledge || response.data.data);
        // Small delay between pledges
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Wait for events to process
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get updated campaign totals
      const updatedResponse = await campaignAPI.getById(campaignId);
      const updatedTotals = updatedResponse.data.data.totals || {
        totalRaised: 0,
        totalPledges: 0,
        averagePledge: 0,
      };

      setResults({
        pledgesCreated: createdPledges.length,
        initialTotals,
        updatedTotals,
        difference: {
          totalRaised: updatedTotals.totalRaised - initialTotals.totalRaised,
          totalPledges: updatedTotals.totalPledges - initialTotals.totalPledges,
        },
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
        <h1>CQRS Read Model Test</h1>
        <p className="subtitle">
          Test that campaign totals are updated via events (Event-Driven Read Model)
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
            <label>Amount per Pledge</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Number of Pledges</label>
            <input
              type="number"
              value={numPledges}
              onChange={(e) => setNumPledges(parseInt(e.target.value))}
              min="1"
              max="10"
            />
          </div>

          <button
            onClick={runTest}
            className="btn btn-primary"
            disabled={loading || !campaignId || !userId}
          >
            {loading ? 'Running Test...' : 'Run CQRS Test'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {results && (
          <div className="test-results success">
            <h2>Test Results</h2>

            <div className="result-comparison">
              <div className="result-box">
                <h3>Before (Initial Totals)</h3>
                <p><strong>Total Raised:</strong> ${results.initialTotals.totalRaised}</p>
                <p><strong>Total Pledges:</strong> {results.initialTotals.totalPledges}</p>
                <p><strong>Average Pledge:</strong> ${results.initialTotals.averagePledge}</p>
              </div>

              <div className="result-box">
                <h3>After (Updated Totals)</h3>
                <p><strong>Total Raised:</strong> ${results.updatedTotals.totalRaised}</p>
                <p><strong>Total Pledges:</strong> {results.updatedTotals.totalPledges}</p>
                <p><strong>Average Pledge:</strong> ${results.updatedTotals.averagePledge}</p>
              </div>
            </div>

            <div className="result-verification">
              <h3>Changes Detected</h3>
              <p>
                <strong>Pledges Created:</strong> {results.pledgesCreated}
              </p>
              <p>
                <strong>Total Raised Increased:</strong> ${results.difference.totalRaised}
              </p>
              <p>
                <strong>Total Pledges Increased:</strong> {results.difference.totalPledges}
              </p>

              {results.difference.totalRaised > 0 && (
                <p className="success-text">
                  ✓ SUCCESS: CQRS Read Model updated via events!
                </p>
              )}
            </div>

            <div className="result-info">
              <h3>How CQRS Works</h3>
              <ol>
                <li>Pledge created → Event published to RabbitMQ</li>
                <li>Campaign Service consumes the event</li>
                <li>CampaignTotals read model is updated</li>
                <li>Read queries are fast (no joins needed)</li>
                <li>Write and read models are separated</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CQRSTest;

