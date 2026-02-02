import { useState, useEffect } from 'react';
import { paymentAPI } from '../services/api';
import './TestPages.css';

function StateMachineTest() {
  const [pledgeId, setPledgeId] = useState('');
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

  const createPayment = async () => {
    if (!pledgeId) {
      setError('Please enter Pledge ID');
      return;
    }

    setLoading(true);
    setError(null);
    setPayment(null);

    const requestBody = {
      pledgeId,
      amount,
      idempotencyKey: `state-test-${Date.now()}`,
      paymentMethod: 'STRIPE',
    };

    try {
      const response = await paymentAPI.create(requestBody);
      setPayment(response.data.data.payment);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create payment');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshPayment = async () => {
    if (!payment?._id) return;

    try {
      const response = await paymentAPI.getById(payment._id);
      setPayment(response.data.data.payment);
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  };

  useEffect(() => {
    if (payment?._id) {
      // Auto-refresh every 2 seconds to see state changes
      const interval = setInterval(refreshPayment, 2000);
      return () => clearInterval(interval);
    }
  }, [payment?._id]);

  return (
    <div className="test-page">
      <div className="container">
        <h1>State Machine Pattern Test</h1>
        <p className="subtitle">
          Test payment state transitions and state machine enforcement
        </p>

        <div className="test-form">
          <div className="form-group">
            <label>Pledge ID *</label>
            <input
              type="text"
              value={pledgeId}
              onChange={(e) => setPledgeId(e.target.value)}
              placeholder="Enter pledge ID"
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
            onClick={createPayment}
            className="btn btn-primary"
            disabled={loading || !pledgeId}
          >
            {loading ? 'Creating Payment...' : 'Create Payment'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {payment && (
          <div className="test-results success">
            <h2>Payment State Machine</h2>
            <div className="result-item">
              <strong>Payment ID:</strong> {payment._id}
            </div>
            <div className="result-item">
              <strong>Current State:</strong>{' '}
              <span className={`state-badge state-${payment.status?.toLowerCase()}`}>
                {payment.status}
              </span>
            </div>
            <div className="result-item">
              <strong>Amount:</strong> ${payment.amount}
            </div>
            <div className="result-item">
              <strong>Payment Method:</strong> {payment.paymentMethod}
            </div>

            {payment.stateHistory && payment.stateHistory.length > 0 && (
              <div className="state-history">
                <h3>State Transition History</h3>
                <div className="state-timeline">
                  {payment.stateHistory.map((transition, index) => (
                    <div key={index} className="state-transition">
                      <div className="transition-arrow">
                        {transition.fromState} → {transition.toState}
                      </div>
                      <div className="transition-time">
                        {new Date(transition.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="result-info">
              <h3>How State Machine Works</h3>
              <ul>
                <li>Valid state transitions are enforced</li>
                <li>Invalid transitions are rejected</li>
                <li>All state changes are tracked in history</li>
                <li>States: INITIATED → AUTHORIZED → COMPLETED (or FAILED)</li>
              </ul>
            </div>

            <button onClick={refreshPayment} className="btn btn-secondary">
              Refresh State
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StateMachineTest;

