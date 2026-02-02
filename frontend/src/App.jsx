import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Donate from './pages/Donate';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import CreateCampaign from './pages/CreateCampaign';
import IdempotencyTest from './pages/IdempotencyTest';
import OutboxTest from './pages/OutboxTest';
import StateMachineTest from './pages/StateMachineTest';
import CQRSTest from './pages/CQRSTest';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/campaigns/:id/donate" element={<Donate />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/campaigns/create" element={<CreateCampaign />} />
          <Route path="/test/idempotency" element={<IdempotencyTest />} />
          <Route path="/test/outbox" element={<OutboxTest />} />
          <Route path="/test/state-machine" element={<StateMachineTest />} />
          <Route path="/test/cqrs" element={<CQRSTest />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

