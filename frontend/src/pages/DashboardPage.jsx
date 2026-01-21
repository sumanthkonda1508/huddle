import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
    const { currentUser, userProfile } = useAuth();
    const [hosted, setHosted] = useState([]);
    const [joined, setJoined] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('hosted');
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            api.getHostedEvents(),
            api.getJoinedEvents()
        ]).then(([hostedRes, joinedRes]) => {
            setHosted(hostedRes.data);
            setJoined(joinedRes.data);
        }).catch(err => {
            console.error(err);
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
        try {
            await api.deleteEvent(id);
            setHosted(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            alert('Failed to delete event: ' + err.message);
        }
    };

    if (loading) return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Loading Dashboard...</div>
        </div>
    );

    const EventList = ({ events, isHosted }) => {
        if (events.length === 0) return (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px dashed var(--border-color)' }}>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    {isHosted ? "You haven't hosted any events yet." : "You haven't joined any events yet."}
                </p>
                {isHosted ? (
                    <Link to="/create-event" className="btn">Create Your First Event</Link>
                ) : (
                    <Link to="/" className="btn">Browse Events</Link>
                )}
            </div>
        );

        return (
            <div className="event-grid">
                {events.map(event => (
                    <div key={event.id} className="card event-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Card Image Placeholder or Media logic could go here */}
                        <div style={{
                            height: '140px',
                            background: 'linear-gradient(to right, #1E293B, #334155)', /* Fallback */
                            borderRadius: 'var(--radius) var(--radius) 0 0',
                            margin: '-1.5rem -1.5rem 1rem -1.5rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {event.mediaUrls && event.mediaUrls.length > 0 && (
                                <img src={event.mediaUrls[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            )}
                            <div style={{
                                position: 'absolute', top: '1rem', right: '1rem',
                                background: 'rgba(0,0,0,0.6)', color: 'white',
                                padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem'
                            }}>
                                {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        </div>

                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{event.title}</h3>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span>📍 {event.city}</span>
                                <span>🏷️ {event.hobby}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: isHosted ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
                            <Link to={`/events/${event.id}`} className="btn-secondary" style={{ justifyContent: 'center' }}>
                                View Details
                            </Link>
                            {isHosted && (
                                <Link to={`/events/${event.id}/edit`} className="btn-secondary" style={{ justifyContent: 'center' }}>
                                    Edit
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            {/* Header */}
            <div className="dashboard-header">
                <div className="container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>Welcome, {currentUser?.displayName || 'User'}!</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>Manage your events and upcoming plans.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {/* Admin Link Temporary for Dev or based on Role */}
                            {userProfile?.role === 'admin' && (
                                <Link to="/admin" className="btn-secondary">
                                    Admin Dashboard
                                </Link>
                            )}
                            <Link to="/events/new" className="btn">
                                + New Event
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container">
                {/* Tabs */}
                <div className="dashboard-tabs">
                    <button
                        onClick={() => setActiveTab('hosted')}
                        className={`tab-btn ${activeTab === 'hosted' ? 'active' : ''}`}
                    >
                        Hosted Events ({hosted.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('joined')}
                        className={`tab-btn ${activeTab === 'joined' ? 'active' : ''}`}
                    >
                        Attending ({joined.length})
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'hosted' ? (
                    <EventList events={hosted} isHosted={true} />
                ) : (
                    <EventList events={joined} isHosted={false} />
                )}
            </div>
        </div>
    );
}
