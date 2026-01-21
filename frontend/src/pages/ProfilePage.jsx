import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState({
        displayName: '',
        bio: '',
        city: '',
        hobbies: [],
        avatarUrl: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (currentUser) loadProfile();
    }, [currentUser]);

    const loadProfile = async () => {
        try {
            const res = await api.getProfile();
            setProfile(prev => ({ ...prev, ...res.data }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await api.updateProfile(profile);
            setMessage('Profile updated successfully!');
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            setMessage('Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Loading Profile...</div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            {/* Header */}
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
                            <h1 style={{ marginBottom: '0.5rem' }}>My Profile</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>Manage your personal information and membership.</p>
                        </div>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="btn-secondary">
                                ✎ Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '800px' }}>
                {message && (
                    <div style={{
                        marginBottom: '2rem', padding: '1rem', borderRadius: 'var(--radius)',
                        background: message.includes('Failed') ? '#FEE2E2' : '#DCFCE7',
                        color: message.includes('Failed') ? '#991B1B' : '#166534',
                        border: `1px solid ${message.includes('Failed') ? '#FCA5A5' : '#86EFAC'}`
                    }}>
                        {message}
                    </div>
                )}

                {isEditing ? (
                    <div className="card">
                        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>Edit Details</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Display Name</label>
                                    <input
                                        type="text"
                                        name="displayName"
                                        value={profile.displayName}
                                        onChange={handleChange}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={profile.city}
                                        onChange={handleChange}
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Bio</label>
                                <textarea
                                    name="bio"
                                    value={profile.bio || ''}
                                    onChange={handleChange}
                                    className="input-field"
                                    rows="4"
                                    placeholder="Tell us a bit about yourself..."
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Avatar URL</label>
                                <input
                                    type="text"
                                    name="avatarUrl"
                                    value={profile.avatarUrl || ''}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="https://example.com/me.png"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn" disabled={saving} style={{ width: '150px' }}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {/* Profile Hero */}
                        <div style={{
                            background: 'linear-gradient(to right, #F1F5F9, #E2E8F0)',
                            padding: '3rem 2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2rem',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                width: '100px', height: '100px', borderRadius: '50%',
                                backgroundColor: 'white',
                                backgroundImage: `url(${profile.avatarUrl})`,
                                backgroundSize: 'cover', backgroundPosition: 'center',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2.5rem', border: '4px solid white',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                {!profile.avatarUrl && '👤'}
                            </div>
                            <div>
                                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>{profile.displayName || 'Anonymous User'}</h2>
                                <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)' }}>
                                    <span>📍 {profile.city || 'No city set'}</span>
                                    <span>📅 Joined {new Date(currentUser?.metadata?.creationTime).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '2rem' }}>
                            <div style={{ marginBottom: '2.5rem' }}>
                                <h4 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '1rem' }}>About Me</h4>
                                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                                    {profile.bio || <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>This user has not written a bio yet.</span>}
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '1rem' }}>Membership & Verification</h4>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{
                                        padding: '1rem 1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
                                        flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                    }}>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Current Plan</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', textTransform: 'capitalize' }}>{profile.plan || 'Free'} Plan</span>
                                        {!profile.plan || profile.plan === 'free' ? (
                                            <Link to="/plans" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '500' }}>Upgrade to Pro →</Link>
                                        ) : null}
                                    </div>

                                    <div style={{
                                        padding: '1rem 1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
                                        flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                    }}>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Host Status</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {profile.isVerified ? (
                                                <>
                                                    <span style={{ color: '#10B981', fontSize: '1.2rem' }}>✓</span>
                                                    <span style={{ fontWeight: 'bold' }}>Verified Host</span>
                                                </>
                                            ) : profile.verificationStatus === 'pending' ? (
                                                <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>Verification Pending...</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)' }}>Standard Member</span>
                                            )}
                                        </div>
                                        {!profile.isVerified && profile.verificationStatus !== 'pending' && (
                                            <Link to="/verification" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '500' }}>Request Verification →</Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
