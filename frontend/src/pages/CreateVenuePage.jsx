import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Building, MapPin, Users, IndianRupee, Image as ImageIcon, Phone, Mail, Globe, CheckSquare, X, Info, Utensils } from 'lucide-react';
import { CITIES, AMENITIES, CATERING_OPTIONS } from '../base/venue_constants';
import { compressImage } from '../utils/imageUtils';
import { useDialog } from '../context/DialogContext';

export default function CreateVenuePage() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [venueCount, setVenueCount] = useState(null);
    const { showDialog } = useDialog();
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        city: '',
        capacity: '',
        price_per_hour: '',
        description: '',
        imageUrl: '',
        contact_email: currentUser?.email || '',
        contact_phone: '',
        website: '',
        catering: 'outside_allowed',
        amenities: []
    });

    useEffect(() => {
        const checkVerification = async () => {
            if (!userProfile) return;

            // Allow editing existing venues regardless of current status (optional, but usually safe)
            if (isEditing) return;

            if (userProfile.isVenueVerified) {
                // All good
            } else if (userProfile.venueVerificationStatus === 'pending') {
                showDialog({
                    title: 'Verification Pending',
                    message: 'Your venue verification is pending approval.',
                    type: 'alert',
                    onConfirm: () => navigate('/dashboard')
                });
            } else {
                // Not verified or rejected
                navigate('/venue-verification');
            }
        };
        checkVerification();

        if (isEditing) {
            setLoading(true);
            api.getVenueDetails(id)
                .then(res => {
                    const data = res.data;
                    setFormData({
                        name: data.name || '',
                        location: data.location || '',
                        city: data.city || '',
                        capacity: data.capacity || '',
                        price_per_hour: data.price_per_hour || '',
                        description: data.description || '',
                        imageUrl: data.images?.[0] || '', // Assuming single image for now in form
                        contact_email: data.contact_email || '',
                        contact_phone: data.contact_phone || '',
                        website: data.website || '',
                        catering: data.catering || 'outside_allowed',
                        amenities: data.amenities || []
                    });
                })
                .catch(err => {
                    console.error("Failed to load venue", err);
                    showDialog({ title: 'Error', message: "Failed to load venue details", type: 'error' });
                    navigate('/venues');
                })
                .finally(() => setLoading(false));
        } else {
            // Check plan limits only for new venues
            api.getMyVenues()
                .then(res => setVenueCount(res.data.length))
                .catch(console.error);
        }
    }, [id, isEditing, navigate, userProfile, showDialog]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const base64 = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.6 });
            setFormData(prev => ({ ...prev, imageUrl: base64 }));
        } catch (err) {
            console.error("Image processing failed", err);
            showDialog({ title: 'Error', message: 'Failed to process image. Please try another file.', type: 'error' });
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, imageUrl: '' }));
    };

    const handleAmenityChange = (amenity) => {
        setFormData(prev => {
            const current = prev.amenities;
            if (current.includes(amenity)) {
                return { ...prev, amenities: current.filter(a => a !== amenity) };
            } else {
                return { ...prev, amenities: [...current, amenity] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validate Phone (Indian Mobile Format)
        if (!/^[6-9]\d{9}$/.test(formData.contact_phone)) {
            showDialog({ title: 'Validation Error', message: "Please enter a valid 10-digit Indian mobile number.", type: 'alert' });
            setLoading(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                images: formData.imageUrl ? [formData.imageUrl] : []
            };

            if (isEditing) {
                await api.updateVenue(id, payload);
                showDialog({ title: 'Success', message: "Venue updated successfully!", type: 'success' });
                navigate(-1);
            } else {
                payload.owner_id = currentUser.uid;
                await api.createVenue(payload);
                navigate('/venues');
            }
        } catch (error) {
            console.error("Failed to save venue:", error);
            if (!isEditing && (error.response?.status === 403 || (error.response?.data?.error && error.response.data.error.includes('limit reached')))) {
                showDialog({
                    title: 'Upgrade Required',
                    message: "You've reached the limit for free venue listings. Upgrade to Venue Pro to list unlimited venues?",
                    type: 'confirm',
                    onConfirm: () => navigate('/plans')
                });
            } else {
                showDialog({ title: 'Error', message: "Failed to save venue. " + (error.response?.data?.error || "Please check required fields."), type: 'error' });
            }
        } finally {
            setLoading(false);
        }
    };

    const planName = userProfile?.plan === 'venue_pro' ? 'Venue Pro' : 'Basic';
    const isPro = planName === 'Venue Pro';
    const limit = isPro ? Infinity : 1;
    const count = venueCount || 0;

    // Only show limit banner if creating new
    const showLimitBanner = !isEditing;

    return (
        <div className="create-event-container">
            <button
                onClick={() => navigate(-1)}
                className="back-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ArrowLeft size={20} /> Back
            </button>
            <h1 className="page-title">{isEditing ? 'Edit Venue' : 'List Your Venue'}</h1>

            {/* Plan Status Banner - Only for New */}
            {showLimitBanner && (
                <div className="card" style={{
                    marginBottom: '2rem',
                    padding: '1.5rem',
                    background: isPro ? 'linear-gradient(to right, #f0fdf4, #dcfce7)' : '#f8fafc',
                    border: isPro ? '1px solid #86efac' : '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: isPro ? '#15803d' : 'var(--text-primary)' }}>
                            Current Plan: {planName}
                        </h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                            {isPro ? (
                                <span>You have <strong>Unlimited</strong> listings available.</span>
                            ) : (
                                <span>You have used <strong>{count} / {limit}</strong> free listings.</span>
                            )}
                        </p>
                    </div>
                    {!isPro && (
                        <button
                            onClick={() => navigate('/plans')}
                            className="btn-primary"
                            style={{ background: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', color: 'white' }}
                        >
                            Upgrade to Pro
                        </button>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Basic Info Section */}
                <div className="form-section">
                    <h2 className="section-title"><Building size={24} /> Basic Information</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Venue Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="e.g. Grand Banquet Hall"
                                required
                            />
                        </div>

                        <div className="form-grid two-col">
                            <div className="form-group">
                                <label className="form-label">City *</label>
                                <select
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="input-field"
                                    required
                                >
                                    <option value="">Select City</option>
                                    {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Full Address *</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Street, Area, Pin Code"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className="input-field"
                                rows="4"
                                placeholder="Describe the ambiance, suitable events, and key highlights..."
                            />
                        </div>
                    </div>
                </div>

                {/* Capacity & Pricing Section */}
                <div className="form-section">
                    <h2 className="section-title"><Info size={24} /> Capacity & Pricing</h2>
                    <div className="form-grid two-col">
                        <div className="form-group">
                            <label className="form-label">Capacity (Guests) *</label>
                            <div style={{ position: 'relative' }}>
                                <Users size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="number"
                                    name="capacity"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem' }}
                                    placeholder="e.g. 500"
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Price per Hour (₹)</label>
                            <div style={{ position: 'relative' }}>
                                <IndianRupee size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="number"
                                    name="price_per_hour"
                                    value={formData.price_per_hour}
                                    onChange={handleChange}
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem' }}
                                    placeholder="e.g. 2000"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features & Amenities Section */}
                <div className="form-section">
                    <h2 className="section-title"><CheckSquare size={24} /> Features & Amenities</h2>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label className="form-label">Amenities</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                            {AMENITIES.map(amenity => (
                                <label key={amenity} className="selection-card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.amenities.includes(amenity)}
                                        onChange={() => handleAmenityChange(amenity)}
                                        style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)', position: 'static', opacity: 1, cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{amenity}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label"><Utensils size={18} style={{ display: 'inline', marginRight: '0.5rem' }} /> Catering Policy</label>
                        <div className="selection-grid">
                            {CATERING_OPTIONS.map(opt => (
                                <label key={opt.value} className="selection-card">
                                    <input
                                        type="radio"
                                        name="catering"
                                        value={opt.value}
                                        checked={formData.catering === opt.value}
                                        onChange={handleChange}
                                    />
                                    <div className="card-content" style={{ padding: '1rem', flexDirection: 'row', justifyContent: 'flex-start', textAlign: 'left' }}>
                                        <div style={{ flex: 1, fontWeight: 600 }}>{opt.label}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Images Section */}
                <div className="form-section">
                    <h2 className="section-title"><ImageIcon size={24} /> Venue Image</h2>
                    <div className="form-group">
                        <label className="form-label">Cover Image</label>
                        <div className="upload-area" style={{ position: 'relative', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    opacity: 0, cursor: 'pointer', zIndex: 5
                                }}
                            />
                            {formData.imageUrl ? (
                                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                                    <img
                                        src={formData.imageUrl}
                                        alt="Cover Preview"
                                        style={{ maxHeight: '300px', maxWidth: '100%', borderRadius: 'var(--radius)', objectFit: 'cover' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault(); // Prevent file dialog from opening again via label/bubbling if any
                                            handleRemoveImage();
                                        }}
                                        style={{
                                            position: 'absolute', top: '-10px', right: '-10px',
                                            background: 'var(--danger)', color: 'white', border: '2px solid white', borderRadius: '50%',
                                            width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                        title="Remove Image"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{ pointerEvents: 'none' }}>
                                    <ImageIcon size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 500 }}>Click or drag to upload cover image</p>
                                    <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>JPG, PNG up to 5MB</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Contact Info Section */}
                <div className="form-section">
                    <h2 className="section-title"><Phone size={24} /> Contact Details</h2>
                    <div className="form-grid two-col">
                        <div className="form-group">
                            <label className="form-label">Contact Phone *</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="tel"
                                    name="contact_phone"
                                    value={formData.contact_phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setFormData(prev => ({ ...prev, contact_phone: val }));
                                    }}
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem' }}
                                    placeholder="10-digit mobile number"
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact Email *</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="email"
                                    name="contact_email"
                                    value={formData.contact_email}
                                    onChange={handleChange}
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem' }}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Website (Optional)</label>
                        <div style={{ position: 'relative' }}>
                            <Globe size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className="input-field"
                                style={{ paddingLeft: '2.5rem' }}
                                placeholder="https://yourvenue.com"
                            />
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn btn-lg" disabled={loading}>
                        {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'List Venue')}
                    </button>
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary btn-lg">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
