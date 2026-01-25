import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Upload, MapPin, Users, DollarSign, Image as ImageIcon, Phone, Mail, Globe, CheckSquare, X } from 'lucide-react';
import { CITIES, AMENITIES, CATERING_OPTIONS } from '../base/venue_constants';
import { compressImage } from '../utils/imageUtils';

export default function CreateVenuePage() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [venueCount, setVenueCount] = useState(null);
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
                    alert("Failed to load venue details");
                    navigate('/venues');
                })
                .finally(() => setLoading(false));
        } else {
            // Check plan limits only for new venues
            api.getMyVenues()
                .then(res => setVenueCount(res.data.length))
                .catch(console.error);
        }
    }, [id, isEditing, navigate]);

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
            alert('Failed to process image. Please try another file.');
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
            alert("Please enter a valid 10-digit Indian mobile number.");
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
                alert("Venue updated successfully!");
                navigate(-1);
            } else {
                payload.owner_id = currentUser.uid;
                await api.createVenue(payload);
                navigate('/venues');
            }
        } catch (error) {
            console.error("Failed to save venue:", error);
            if (!isEditing && (error.response?.status === 403 || (error.response?.data?.error && error.response.data.error.includes('limit reached')))) {
                if (window.confirm("You've reached the limit for free venue listings. Upgrade to Venue Pro to list unlimited venues?")) {
                    navigate('/plans');
                }
            } else {
                alert("Failed to save venue. " + (error.response?.data?.error || "Please check required fields."));
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
        <div className="container fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
            <h1 className="page-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                {isEditing ? 'Edit Venue' : 'List Your Venue'}
            </h1>

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
                            style={{ background: 'var(--primary)', fontSize: '0.9rem' }}
                        >
                            Upgrade to Pro
                        </button>
                    )}
                </div>
            )}

            <div className="card" style={{ padding: '2rem' }}>
                <form onSubmit={handleSubmit} className="form-group">
                    {/* Basic Info */}
                    <div className="section-title" style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary)' }}>Basic Information</div>

                    <div className="form-field">
                        <label className="form-label">Venue Name *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label className="form-label">City *</label>
                            <select name="city" value={formData.city} onChange={handleChange} className="form-input" required>
                                <option value="">Select City</option>
                                {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                            </select>
                        </div>
                        <div className="form-field">
                            <label className="form-label">Full Address *</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="form-input" placeholder="Street, Area, Pin Code" required />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label className="form-label">Capacity (Guests) *</label>
                            <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} className="form-input" required />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Price per Hour (₹)</label>
                            <input type="number" name="price_per_hour" value={formData.price_per_hour} onChange={handleChange} className="form-input" />
                        </div>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} className="form-textarea" rows="4" placeholder="Describe the ambiance, suitable events..."></textarea>
                    </div>

                    {/* Features */}
                    <div className="section-title" style={{ fontWeight: 600, fontSize: '1.2rem', margin: '2rem 0 1rem 0', color: 'var(--primary)' }}>Features & Amenities</div>

                    <div className="form-field">
                        <label className="form-label">Amenities</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                            {AMENITIES.map(amenity => (
                                <label key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.amenities.includes(amenity)}
                                        onChange={() => handleAmenityChange(amenity)}
                                    />
                                    <span style={{ fontSize: '0.9rem' }}>{amenity}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Catering Policy</label>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            {CATERING_OPTIONS.map(opt => (
                                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="catering"
                                        value={opt.value}
                                        checked={formData.catering === opt.value}
                                        onChange={handleChange}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Media */}
                    <div className="section-title" style={{ fontWeight: 600, fontSize: '1.2rem', margin: '2rem 0 1rem 0', color: 'var(--primary)' }}>Images</div>
                    <div className="form-field">
                        <label className="form-label">Cover Image</label>
                        <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center', background: 'var(--bg-secondary)', position: 'relative' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    opacity: 0, cursor: 'pointer'
                                }}
                            />
                            {formData.imageUrl ? (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img
                                        src={formData.imageUrl}
                                        alt="Cover Preview"
                                        style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: 'var(--radius)', objectFit: 'cover' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleRemoveImage();
                                        }}
                                        style={{
                                            position: 'absolute', top: '-10px', right: '-10px',
                                            background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%',
                                            width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            zIndex: 10
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{ pointerEvents: 'none' }}>
                                    <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Click or drag image to upload</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="section-title" style={{ fontWeight: 600, fontSize: '1.2rem', margin: '2rem 0 1rem 0', color: 'var(--primary)' }}>Contact Details</div>
                    <div className="form-row">
                        <div className="form-field">
                            <label className="form-label"><Phone size={16} /> Contact Phone *</label>
                            <input
                                type="tel"
                                name="contact_phone"
                                value={formData.contact_phone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setFormData(prev => ({ ...prev, contact_phone: val }));
                                }}
                                className="form-input"
                                placeholder="10-digit mobile number"
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label className="form-label"><Mail size={16} /> Contact Email *</label>
                            <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} className="form-input" required />
                        </div>
                    </div>
                    <div className="form-field">
                        <label className="form-label"><Globe size={16} /> Website (Optional)</label>
                        <input type="url" name="website" value={formData.website} onChange={handleChange} className="form-input" placeholder="https://" />
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'List Venue')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
