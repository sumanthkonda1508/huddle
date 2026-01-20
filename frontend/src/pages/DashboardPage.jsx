import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';

export default function DashboardPage() {
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

    if (loading) return <div className="loading">Loading Dashboard...</div>;

    const EventList = ({ events, isHosted }) => {
        if (events.length === 0) return <p style={{ color: '#666' }}>No events found.</p>;

        return (
            <div className="event-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginTop: '1rem'
            }}>
                {events.map(event => (
                    <div key={event.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1rem', flex: 1 }}>
                            <h3 style={{ margin: '0 0 0.5rem 0' }}>{event.title}</h3>
                            <p style={{ color: '#666', fontSize: '0.9rem' }}>📅 {new Date(event.date).toLocaleDateString()}</p>
                            <p style={{ color: '#666', fontSize: '0.9rem' }}>📍 {event.city}</p>
                        </div>
                        <div style={{ padding: '1rem', background: '#f8f9fa', borderTop: '1px solid #eee', display: 'flex', gap: '0.5rem' }}>
                            <Link to={`/events/${event.id}`} className="btn-secondary" style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem' }}>
                                View
                            </Link>
                            {isHosted && (
                                <>
                                    <Link to={`/events/${event.id}/edit`} className="btn-secondary" style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem' }}>
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        className="btn-danger"
                                        style={{ flex: 1, fontSize: '0.8rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="page-container">
            <button
                onClick={() => navigate(-1)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '1rem',
                    padding: 0
                }}
            >
                ← Back
            </button>
            <h1 className="page-title">My Dashboard</h1>

            <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #eee' }}>
                <button
                    onClick={() => setActiveTab('hosted')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'hosted' ? '2px solid var(--primary)' : 'none',
                        fontWeight: activeTab === 'hosted' ? 'bold' : 'normal',
                        cursor: 'pointer',
                        color: activeTab === 'hosted' ? 'var(--primary)' : 'inherit'
                    }}
                >
                    Hosted Events ({hosted.length})
                </button>
                <button
                    onClick={() => setActiveTab('joined')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'joined' ? '2px solid var(--primary)' : 'none',
                        fontWeight: activeTab === 'joined' ? 'bold' : 'normal',
                        cursor: 'pointer',
                        color: activeTab === 'joined' ? 'var(--primary)' : 'inherit'
                    }}
                >
                    Attending ({joined.length})
                </button>
            </div>

            {activeTab === 'hosted' ? <EventList events={hosted} isHosted={true} /> : <EventList events={joined} isHosted={false} />}
        </div>
    );
}
