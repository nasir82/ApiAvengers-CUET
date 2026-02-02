import { useEffect, useState } from 'react';
import { notificationAPI } from '../services/api';
import './Notifications.css';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState('');

  const loadNotifications = async () => {
    if (!userId) {
      setError('Please enter a User ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await notificationAPI.getUserNotifications(userId);
      setNotifications(response.data.data.notifications || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load notifications');
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    loadNotifications();
  };

  return (
    <div className="notifications-page">
      <div className="container">
        <h1>Notifications</h1>
        <p className="subtitle">View user notifications</p>

        <form onSubmit={handleSubmit} className="notification-form">
          <div className="form-group">
            <label htmlFor="userId">User ID</label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : 'Load Notifications'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {!loading && notifications.length === 0 && userId && !error && (
          <div className="no-notifications">
            <p>No notifications found for this user.</p>
          </div>
        )}

        {notifications.length > 0 && (
          <div className="notifications-list">
            <h2>Notifications ({notifications.length})</h2>
            {notifications.map((notification) => (
              <div key={notification._id} className="notification-card">
                <div className="notification-header">
                  <span className="notification-type">{notification.type}</span>
                  <span className="notification-date">
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="notification-message">{notification.message}</p>
                <div className="notification-meta">
                  <span>Read: {notification.read ? 'Yes' : 'No'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;

