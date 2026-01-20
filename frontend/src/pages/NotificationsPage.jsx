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
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>

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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="page-title" style={{ margin: 0 }}>Notifications</h1>
                {notifications.some(n => !n.read) && (
                    <button onClick={handleMarkAllRead} className="btn-secondary" style={{ fontSize: '0.9rem' }}>
                        Mark all read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No notifications yet.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.map(n => (
                        <div
                            key={n.id}
                            onClick={() => !n.read && handleMarkRead(n.id)}
                            style={{
                                padding: '1rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius)',
                                background: n.read ? 'transparent' : 'rgba(139, 92, 246, 0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 'bold' }}>{n.title}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                                </span>
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-primary)' }}>{n.message}</p>

                            {n.relatedEventId && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <Link
                                        to={`/events/${n.relatedEventId}`}
                                        style={{ fontSize: '0.9rem', color: 'var(--primary)' }}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Don't trigger div click if link clicked (though handler logic is idempotent usually)
                                            if (!n.read) handleMarkRead(n.id);
                                        }}
                                    >
                                        View Event →
                                    </Link>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
