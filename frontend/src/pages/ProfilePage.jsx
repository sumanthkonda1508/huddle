import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useBlocker, useBeforeUnload } from 'react-router-dom';
import { api } from '../api/client';
import { auth } from '../firebase';
import { updateProfile, signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { compressImage } from '../utils/imageUtils';
import { useDialog } from '../context/DialogContext';
import { MapPin, Calendar, User, Edit2, ArrowLeft, Camera, Trash2, Check, X, LogOut } from 'lucide-react';
import ImageCropper from '../components/ImageCropper';

export default function ProfilePage() {
    const { currentUser, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const { showDialog } = useDialog();
    const [profile, setProfile] = useState({
        displayName: '',
        bio: '',
        city: '',
        hobbies: [],
        avatarUrl: ''
    });
    const [initialProfile, setInitialProfile] = useState({
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
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    useEffect(() => {
        if (currentUser) loadProfile();
    }, [currentUser]);

    const loadProfile = async () => {
        try {
            const res = await api.getProfile();
            setProfile(prev => ({ ...prev, ...res.data }));
            setInitialProfile(prev => ({ ...prev, ...res.data })); // Set initial state

            // Sync AuthContext with latest profile data
            await refreshProfile();
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

    const handleRemoveAvatar = () => {
        showDialog({
            title: 'Remove Avatar',
            message: 'Are you sure you want to remove your profile picture?',
            type: 'confirm',
            onConfirm: () => {
                setProfile(prev => ({ ...prev, avatarUrl: '' }));
            }
        });
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
            setMessage('Failed to log out.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await api.updateProfile(profile);

            // Sync with Firebase Auth
            if (currentUser && profile.displayName !== currentUser.displayName) {
                await updateProfile(currentUser, {
                    displayName: profile.displayName
                    // Don't sync photoURL as it might be a base64 string which is too long for Firebase Auth
                });
            }

            setMessage('Profile updated successfully!');
            setInitialProfile(profile); // Update initial state on save
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            setMessage('Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    // Check if dirty
    const isDirty = initialProfile && JSON.stringify(profile) !== JSON.stringify(initialProfile);

    // Browser close warning
    useBeforeUnload(
        useCallback(
            (e) => {
                if (isDirty) {
                    e.preventDefault();
                    e.returnValue = '';
                }
            },
            [isDirty]
        )
    );

    // In-app navigation blocking
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === "blocked") {
            showDialog({
                title: "Unsaved Changes",
                message: "You have unsaved changes. Are you sure you want to leave?",
                type: "confirm",
                onConfirm: () => blocker.proceed(),
                onCancel: () => blocker.reset()
            });
        }
    }, [blocker, showDialog]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
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
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>My Profile</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>Manage your personal information and membership.</p>
                        </div>
                        {!isEditing && (
                            <button
                                onClick={handleLogout}
                                className="btn"
                                style={{
                                    backgroundColor: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fecaca',
                                    padding: '0.5rem 1rem',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
                                }}
                            >
                                <LogOut size={16} /> Logout
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
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Avatar</label>
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    {/* Preview current/selected avatar */}
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '50%',
                                        backgroundColor: '#f1f5f9',
                                        backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : 'none',
                                        backgroundSize: 'cover', backgroundPosition: 'center',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '2rem', border: '2px solid var(--border-color)',
                                        overflow: 'hidden', flexShrink: 0
                                    }}>
                                        {!profile.avatarUrl && <User size={40} className="text-gray-400" />}
                                    </div>

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                                                {profile.avatarUrl ? 'Update Photo' : 'Upload Photo'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.addEventListener('load', () => {
                                                                setCropImageSrc(reader.result);
                                                                setIsCropping(true);
                                                            });
                                                            reader.readAsDataURL(file);
                                                        }
                                                        // Reset input so selecting same file works again
                                                        e.target.value = null;
                                                    }}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>

                                            {profile.avatarUrl && (
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveAvatar}
                                                    className="btn-secondary"
                                                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            JPG or PNG. Max 1MB.
                                        </div>
                                    </div>
                                </div>
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
                                {!profile.avatarUrl && <User size={48} color="#94a3b8" />}
                            </div>
                            <div>
                                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>{profile.displayName || 'Anonymous User'}</h2>
                                <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={16} /> {profile.city || 'No city set'}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={16} /> Joined {formatDate(currentUser?.metadata?.creationTime)}</span>
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <button onClick={() => setIsEditing(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        <Edit2 size={16} /> Edit Profile
                                    </button>
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
                                {/* Hosting & Venues Actions */}
                                <div>
                                    <h4 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '1rem' }}>Hosting & Venues</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>

                                        {/* Host Event Section */}
                                        <div style={{
                                            padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
                                            background: '#fff', display: 'flex', flexDirection: 'column', gap: '1rem'
                                        }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Want to host an event?</h3>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                    {profile.isVerified ? 'You are a verified host. Create amazing events now!' : 'Verify your identity to start hosting events.'}
                                                </p>
                                            </div>
                                            <div style={{ marginTop: 'auto' }}>
                                                {profile.isVerified ? (
                                                    <button
                                                        onClick={() => navigate('/events/new')}
                                                        className="btn"
                                                        style={{ width: '100%' }}
                                                    >
                                                        Create Event
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => navigate('/verification')}
                                                        className="btn-secondary"
                                                        style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                                                    >
                                                        {profile.verificationStatus === 'pending' ? 'Verification Pending...' : 'Become a Host'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* List Venue Section */}
                                        <div style={{
                                            padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
                                            background: '#fff', display: 'flex', flexDirection: 'column', gap: '1rem'
                                        }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Want to list your venue?</h3>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                    {profile.isVenueVerified ? 'You are a verified venue owner. List your space!' : 'Verify your property to start listing venues.'}
                                                </p>
                                            </div>
                                            <div style={{ marginTop: 'auto' }}>
                                                {profile.isVenueVerified ? (
                                                    <button
                                                        onClick={() => navigate('/venues/new')}
                                                        className="btn"
                                                        style={{ width: '100%' }}
                                                    >
                                                        List Venue
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => navigate('/venue-verification')}
                                                        className="btn-secondary"
                                                        style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                                                    >
                                                        {profile.venueVerificationStatus === 'pending' ? 'Venue Verification Pending...' : 'List Your Venue'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {isCropping && (
                <ImageCropper
                    imageSrc={cropImageSrc}
                    aspect={1}
                    onCancel={() => {
                        setIsCropping(false);
                        setCropImageSrc(null);
                    }}
                    onCropComplete={(croppedImg) => {
                        setProfile(prev => ({ ...prev, avatarUrl: croppedImg }));
                        setIsCropping(false);
                        setCropImageSrc(null);
                    }}
                />
            )}
        </div>
    );
}
