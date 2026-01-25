import React from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { api } from '../api/client';
import { DialogProvider } from '../context/DialogContext';
import { Bell, User, Menu, Home, Plus, BarChart, Shield, LogOut, X } from 'lucide-react';

export default function Layout() {
    const { currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [hasUnread, setHasUnread] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);

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
        <DialogProvider>
            <div className="app">
                <header className="navbar">
                    <div className="container navbar-content">
                        <button
                            className="hamburger-btn"
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label="Toggle menu"
                            style={{ marginRight: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Menu size={24} />
                        </button>

                        <div className="brand-container">
                            <Link to="/" className="brand">Huddle</Link>
                        </div>

                        {/* Desktop Nav */}
                        <nav className="nav-links desktop-only">
                            <Link to="/">Events</Link>
                            {currentUser ? (
                                <>
                                    <Link to="/events/new">Host Event</Link>
                                    <Link to="/dashboard">Dashboard</Link>
                                    {isAdmin && <Link to="/admin" style={{ color: 'red' }}>Admin</Link>}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        {/* Notifications Bell */}
                                        <Link to="/notifications" style={{ textDecoration: 'none', position: 'relative', display: 'flex', alignItems: 'center', marginRight: '0.5rem', color: 'inherit' }}>
                                            <Bell size={20} />
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
                                            <div style={{ width: '32px', height: '32px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} />}
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{currentUser.displayName || 'User'}</span>
                                        </Link>
                                        <button onClick={handleLogout} className="btn" style={{ padding: '0.4rem 1rem', backgroundColor: 'var(--danger)', fontSize: '0.8rem' }}>Logout</button>
                                    </div>
                                </>
                            ) : (
                                <Link to="/login" className="btn">Login</Link>
                            )}
                        </nav>

                        {/* Mobile Sidebar */}
                        <div className={`mobile-sidebar ${isOpen ? 'open' : ''}`}>
                            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div className="brand" style={{ fontSize: '1.5rem' }}>Menu</div>
                                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }}><X size={24} /></button>
                                </div>

                                <Link to="/" onClick={() => setIsOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Home size={20} /> Home</Link>

                                {currentUser ? (
                                    <>
                                        <Link to="/events/new" onClick={() => setIsOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Plus size={20} /> Host Event</Link>
                                        <Link to="/dashboard" onClick={() => setIsOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><BarChart size={20} /> Dashboard</Link>
                                        <Link to="/profile" onClick={() => setIsOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><User size={20} /> Profile</Link>
                                        <Link to="/notifications" onClick={() => setIsOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Bell size={20} /> Notifications {hasUnread && '🔴'}</Link>
                                        {isAdmin && <Link to="/admin" onClick={() => setIsOpen(false)} style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Shield size={20} /> Admin</Link>}
                                        <button onClick={() => { handleLogout(); setIsOpen(false); }} className="btn" style={{ marginTop: '1rem', width: '100%' }}>Logout</button>
                                    </>
                                ) : (
                                    <Link to="/login" onClick={() => setIsOpen(false)} className="btn" style={{ textAlign: 'center' }}>Login</Link>
                                )}
                            </div>
                        </div>

                        {/* Backdrop */}
                        {isOpen && (
                            <div
                                className="sidebar-backdrop"
                                onClick={() => setIsOpen(false)}
                            ></div>
                        )}
                    </div>
                </header>

                <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
                    <Outlet />
                </main>
            </div>
        </DialogProvider>
    );
}
