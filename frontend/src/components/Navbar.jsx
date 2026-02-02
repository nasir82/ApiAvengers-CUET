import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-content">
          <Link to="/" className="logo">
            CareForAll
          </Link>
          <div className="nav-links">
            <Link to="/campaigns">Campaigns</Link>
            <Link to="/admin">Admin</Link>
            <Link to="/notifications">Notifications</Link>
            <div className="dropdown">
              <span className="dropdown-toggle">Testing</span>
              <div className="dropdown-menu">
                <Link to="/test/idempotency">Idempotency</Link>
                <Link to="/test/outbox">Outbox</Link>
                <Link to="/test/state-machine">State Machine</Link>
                <Link to="/test/cqrs">CQRS</Link>
              </div>
            </div>
            {token ? (
              <>
                <Link to="/profile">Profile</Link>
                <span className="user-name">{user?.name || 'User'}</span>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

