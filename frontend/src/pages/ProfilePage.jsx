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
        <div className="page-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
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
                <h1 className="page-title" style={{ margin: 0 }}>My Profile</h1>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="btn-secondary">
                        Edit Profile
                    </button>
                )}
            </div>

            {message && <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>{message}</div>}

            {isEditing ? (
                <form onSubmit={handleSubmit} className="form-card">
                    <div className="form-group">
                        <label>Display Name</label>
                        <input
                            type="text"
                            name="displayName"
                            value={profile.displayName}
                            onChange={handleChange}
                            className="input-field"
                        />
                    </div>

                    <div className="form-group">
                        <label>City</label>
                        <input
                            type="text"
                            name="city"
                            value={profile.city}
                            onChange={handleChange}
                            className="input-field"
                        />
                    </div>

                    <div className="form-group">
                        <label>Bio</label>
                        <textarea
                            name="bio"
                            value={profile.bio || ''}
                            onChange={handleChange}
                            className="input-field"
                            rows="4"
                        />
                    </div>

                    <div className="form-group">
                        <label>Avatar URL</label>
                        <input
                            type="text"
                            name="avatarUrl"
                            value={profile.avatarUrl || ''}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="https://example.com/me.png"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn" disabled={saving} style={{ flex: 1 }}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary" style={{ flex: 1 }}>
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            backgroundColor: '#ddd', backgroundImage: `url(${profile.avatarUrl})`,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2rem'
                        }}>
                            {!profile.avatarUrl && '👤'}
                        </div>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>{profile.displayName || 'Anonymous User'}</h2>
                            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>📍 {profile.city || 'No city set'}</p>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>About Me</h4>
                        <p style={{ whiteSpace: 'pre-wrap', color: '#444' }}>{profile.bio || 'This user has not written a bio yet.'}</p>
                    </div>

                    <div>
                        <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Membership Status</h4>
                        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Plan</span>
                                <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{profile.plan || 'Free'}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</span>
                                {profile.isVerified ? (
                                    <span style={{ color: 'green', fontWeight: 'bold' }}>Verified Host</span>
                                ) : profile.verificationStatus === 'pending' ? (
                                    <span style={{ color: 'orange', fontWeight: 'bold' }}>Verification Pending</span>
                                ) : (
                                    <span style={{ color: 'var(--text-secondary)' }}>Standard Member</span>
                                )}
                            </div>
                        </div>
                        {!profile.isVerified && profile.verificationStatus !== 'pending' && (
                            <div style={{ marginTop: '1rem' }}>
                                <Link to="/plans" className="btn-secondary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                                    Become a Host
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
