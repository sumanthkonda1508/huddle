import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CreateEventPage from './pages/CreateEventPage';
import EventDetailsPage from './pages/EventDetailsPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import PlansPage from './pages/PlansPage';
import VerificationPage from './pages/VerificationPage';
import AdminPage from './pages/AdminPage';
import { useAuth } from './context/AuthContext';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

import { api } from './api/client'; // Import API

function App() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = React.useState(false);

  React.useEffect(() => {
    if (currentUser) {
      api.getNotifications()
        .then(res => {
          const unread = res.data.some(n => !n.read);
          setHasUnread(unread);
        })
        .catch(err => console.error("Failed to fetch notifications", err));
    }
  }, [currentUser]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="container navbar-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link to="/" style={{ textDecoration: 'none', fontSize: '1.2rem' }}>🏠</Link>
            <Link to="/" className="brand">Huddle</Link>
          </div>
          <nav className="nav-links">
            <Link to="/">Events</Link>
            {currentUser ? (
              <>
                <Link to="/events/new">Host Event</Link>
                <Link to="/dashboard">Dashboard</Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Notifications Bell */}
                  <Link to="/notifications" style={{ textDecoration: 'none', position: 'relative', fontSize: '1.2rem', marginRight: '0.5rem' }}>
                    🔔
                    {hasUnread && (
                      <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '8px',
                        height: '8px',
                        backgroundColor: 'red',
                        borderRadius: '50%',
                        border: '1px solid white'
                      }}></span>
                    )}
                  </Link>

                  <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ width: '32px', height: '32px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      👤
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{currentUser.displayName || currentUser.email}</span>
                  </Link>
                  <button onClick={handleLogout} className="btn" style={{ padding: '0.4rem 1rem', backgroundColor: 'var(--danger)', fontSize: '0.8rem' }}>Logout</button>
                </div>
              </>
            ) : (
              <Link to="/login" className="btn">Login</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/events/new" element={<CreateEventPage />} />
          <Route path="/events/:id/edit" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} /> {/* Added route */}
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
