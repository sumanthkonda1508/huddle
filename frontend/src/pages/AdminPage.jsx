import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, MapPin, ClipboardList, DollarSign } from 'lucide-react';
import SEO from '../components/SEO';

export default function AdminPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (authLoading) return;

        if (userProfile?.role !== 'admin') {
            navigate('/dashboard');
            return;
        }

        api.getPlatformAnalytics()
            .then(res => {
                setAnalytics(res.data);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load platform analytics.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [userProfile, authLoading, navigate]);

    if (authLoading || loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Admin Dashboard...</div>;
    if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>{error}</div>;
    if (!analytics) return null;

    const statCards = [
        { title: 'Total Users', value: analytics.totalUsers, icon: <Users size={24} />, color: '#3B82F6' },
        { title: 'Total Events', value: analytics.totalEvents, icon: <Calendar size={24} />, color: '#8B5CF6' },
        { title: 'Total Venues', value: analytics.totalVenues, icon: <MapPin size={24} />, color: '#10B981' },
        { title: 'Pending Verifications', value: analytics.pendingVerifications, icon: <ClipboardList size={24} />, color: '#F59E0B' },
        { title: 'Platform Revenue', value: `₹${analytics.totalRevenue.toLocaleString()}`, icon: <DollarSign size={24} />, color: '#16A34A' }
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', paddingBottom: '4rem' }}>
            <SEO title="Admin Dashboard | Huddle" />

            <div className="dashboard-header" style={{ background: 'linear-gradient(to right, #1e1b4b, #312e81)', color: 'white' }}>
                <div className="container">
                    <h1 style={{ marginBottom: '0.5rem' }}>Huddle Admin Center</h1>
                    <p style={{ color: '#a5b4fc' }}>Platform health and global metrics</p>
                </div>
            </div>

            <div className="container" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Platform Overview</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                    {statCards.map((stat, i) => (
                        <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', padding: '1.5rem', gap: '1.5rem' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: `${stat.color}20`, color: stat.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {stat.icon}
                            </div>
                            <div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem', fontWeight: 500 }}>
                                    {stat.title}
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {stat.value}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '3rem', padding: '2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ClipboardList size={20} /> Action Items
                    </h3>

                    {analytics.pendingVerifications > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #F59E0B', borderRadius: '4px' }}>
                            <div>
                                <strong style={{ color: '#D97706', display: 'block', marginBottom: '0.25rem' }}>Verifications Pending</strong>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>There are {analytics.pendingVerifications} users waiting for host/venue approval.</span>
                            </div>
                            {/* In a real app we'd route this to a moderation queue page */}
                            <button className="btn-secondary" onClick={() => alert("Moderation queue coming in Phase 6!")}>Review Queue</button>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)' }}>You're all caught up! No pending items.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
