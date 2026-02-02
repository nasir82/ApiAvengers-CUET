import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, pledgeAPI, notificationAPI } from '../services/api';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pledges, setPledges] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || 'null');
      if (userData?.id) {
        const [userRes, pledgesRes, notifRes] = await Promise.all([
          userAPI.getById(userData.id),
          pledgeAPI.getUserPledges(userData.id),
          notificationAPI.getUserNotifications(userData.id),
        ]);
        setUser(userRes.data.data.user);
        setPledges(pledgesRes.data.data.pledges || []);
        setNotifications(notifRes.data.data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <div className="profile-page">
        <h1>My Profile</h1>
        
        {user && (
          <div className="profile-section">
            <h2>Account Information</h2>
            <div className="card">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Total Donated:</strong> ${user.totalDonated || 0}</p>
            </div>
          </div>
        )}

        <div className="profile-section">
          <h2>My Donations</h2>
          {pledges.length === 0 ? (
            <p>No donations yet.</p>
          ) : (
            <div className="pledges-list">
              {pledges.map((pledge) => (
                <div key={pledge._id || pledge.id} className="card">
                  <p><strong>Amount:</strong> ${pledge.amount}</p>
                  <p><strong>Status:</strong> {pledge.status}</p>
                  <p><strong>Date:</strong> {new Date(pledge.createdAt).toLocaleDateString()}</p>
                  {pledge.message && <p><strong>Message:</strong> {pledge.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="profile-section">
          <h2>Notifications</h2>
          {notifications.length === 0 ? (
            <p>No notifications.</p>
          ) : (
            <div className="notifications-list">
              {notifications.map((notif) => (
                <div key={notif._id || notif.id} className="card">
                  <h3>{notif.title}</h3>
                  <p>{notif.message}</p>
                  <small>{new Date(notif.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;

