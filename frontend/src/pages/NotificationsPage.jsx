import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchNotifications = () => {
        setLoading(true);
        api.getNotifications()
            .then(res => setNotifications(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkRead = async (id) => {
        try {
            await api.markNotificationRead(id);
            // Update local state
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, read: true } : n
            ));
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.markAllNotificationsRead();
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div>Loading notifications...</div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            <div className="dashboard-header">
                <div className="container">
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '1rem',
                            padding: 0,
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <span>←</span> Back
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>Notifications</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>Stay updated with your events and community.</p>
                        </div>
                        {notifications.some(n => !n.read) && (
                            <button onClick={handleMarkAllRead} className="btn-secondary" style={{ fontSize: '0.9rem' }}>
                                Mark all as read
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '800px', paddingBottom: '4rem' }}>
                {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>All caught up!</h3>
                        <p>You have no new notifications at the moment.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {notifications.map(n => (
                            <div
                                key={n.id}
                                onClick={() => !n.read && handleMarkRead(n.id)}
                                style={{
                                    padding: '1.5rem',
                                    borderRadius: 'var(--radius)',
                                    background: 'white',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    borderLeft: n.read ? '4px solid transparent' : '4px solid var(--primary)',
                                    opacity: n.read ? 0.8 : 1,
                                    cursor: n.read ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex', gap: '1rem',
                                    alignItems: 'start'
                                }}
                            >
                                <div style={{
                                    minWidth: '40px', height: '40px', borderRadius: '50%',
                                    background: n.read ? '#F1F5F9' : '#FFF1F2',
                                    color: n.read ? '#64748B' : 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.2rem'
                                }}>
                                    {n.title.toLowerCase().includes('event') ? '📅' : '🔔'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: n.read ? '500' : '700', color: 'var(--text-primary)' }}>{n.title}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                                        </span>
                                    </div>
                                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</p>

                                    {n.relatedEventId && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <Link
                                                to={`/events/${n.relatedEventId}`}
                                                style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '500' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!n.read) handleMarkRead(n.id);
                                                }}
                                            >
                                                View Event Details →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                {!n.read && (
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', alignSelf: 'center' }}></div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
