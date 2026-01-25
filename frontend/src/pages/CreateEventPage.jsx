import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNavigate, useParams } from 'react-router-dom';
import { compressImage } from '../utils/imageUtils';
import { useDialog } from '../context/DialogContext';
import { ArrowLeft, Calendar, MapPin, Image, Settings, User, Users } from 'lucide-react';

export default function CreateEventPage() {
    const { showDialog } = useDialog();
    const [formData, setFormData] = useState({
        title: '', description: '', city: '', hobby: '', venue: '', address: '', coordinates: null, price: 0,
        date: '', maxParticipants: 10, eventType: 'solo', maxTicketsPerUser: 4
    });
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;
    const [verifying, setVerifying] = useState(true);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    const venueInputRef = React.useRef(null);

    useEffect(() => {
        // Google Places Autocomplete
        const initAutocomplete = () => {
            if (window.google && window.google.maps && window.google.maps.places && venueInputRef.current) {
                const autocomplete = new window.google.maps.places.Autocomplete(venueInputRef.current, {
                    types: ['establishment', 'geocode'],
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (place.geometry) {
                        const location = place.geometry.location;
                        const addressComponents = place.address_components;
                        let city = '';

                        // Try to find city in address components
                        if (addressComponents) {
                            for (const component of addressComponents) {
                                if (component.types.includes('locality')) {
                                    city = component.long_name;
                                    break;
                                } else if (component.types.includes('administrative_area_level_2')) {
                                    city = component.long_name; // Fallback
                                }
                            }
                        }

                        console.log("Place Selected:", place.name, location.lat(), location.lng());

                        setFormData(prev => ({
                            ...prev,
                            venue: place.name || '',
                            address: place.formatted_address || '',
                            city: city || prev.city,
                            coordinates: { lat: location.lat(), lng: location.lng() }
                        }));
                    }
                });
                return true;
            }
            return false;
        };

        if (!initAutocomplete()) {
            const interval = setInterval(() => {
                if (initAutocomplete()) clearInterval(interval);
            }, 500);
            return () => clearInterval(interval);
        }
    }, []);

    useEffect(() => {
        // ... (existing verification logic) ... 
        const checkVerification = async () => {
            // ... checkVerification ...
            try {
                const res = await api.getProfile();
                if (res.data.isVerified) {
                    setVerifying(false);
                } else if (res.data.verificationStatus === 'pending') {
                    showDialog({
                        title: 'Verification Pending',
                        message: 'Your host verification is pending approval.',
                        type: 'alert',
                        onConfirm: () => navigate('/')
                    });
                } else {
                    navigate('/plans');
                }
            } catch (err) {
                console.error("Profile check failed", err);
                navigate('/');
            }
        };
        checkVerification();

        if (isEditing) {
            // ... (existing fetch logic) ...
            api.getEvent(id).then(res => {
                // ... setup data ...
                const data = res.data;
                let dateStr = '';
                if (data.date) {
                    dateStr = new Date(data.date).toISOString().slice(0, 16);
                }
                setFormData({
                    title: data.title,
                    description: data.description || '',
                    city: data.city,
                    hobby: data.hobby,
                    venue: data.venue,
                    address: data.address || '',
                    date: dateStr,
                    maxParticipants: data.maxParticipants,
                    allowCancellation: data.allowCancellation,
                    price: data.price || 0,
                    eventType: data.eventType || 'solo',
                    maxTicketsPerUser: data.maxTicketsPerUser || 4,
                    mediaUrls: data.mediaUrls || []
                });
                if (venueInputRef.current) {
                    venueInputRef.current.value = data.venue || '';
                }
            }).catch(console.error);
        }
    }, [id, isEditing, navigate]);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (formData.mediaUrls && formData.mediaUrls.length >= 5) {
            showDialog({
                title: 'Limit Reached',
                message: 'Maximum 5 images allowed per event.',
                type: 'alert'
            });
            return;
        }

        try {
            // Compress and convert to Base64
            // Using slightly lower settings to ensure multiple images fit in document
            const base64 = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.6 });

            setFormData(prev => ({
                ...prev,
                mediaUrls: [...(prev.mediaUrls || []), base64]
            }));
            // Clear input so same file can be selected again if needed (though rare)
            e.target.value = null;
        } catch (err) {
            console.error("Image processing failed", err);
            showDialog({
                title: 'Upload Failed',
                message: 'Failed to process image. Please try another file.',
                type: 'error'
            });
        }
    };

    const handleRemoveImage = (indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            mediaUrls: prev.mediaUrls.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        console.log("Saving event data...");

        try {
            // Data already contains base64 mediaUrls if set by handleImageChange
            // No separate upload step needed!

            if (isEditing) {
                await api.updateEvent(id, formData);
                showDialog({
                    title: 'Success',
                    message: 'Event updated successfully!',
                    type: 'success',
                    onConfirm: () => navigate(`/events/${id}`)
                });
            } else {
                await api.createEvent(formData);
                navigate('/');
            }
        } catch (error) {
            console.error("Submit Error:", error);
            showDialog({
                title: 'Error',
                message: 'Failed to save event. ' + error.message,
                type: 'error'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates = { [name]: value };
            // Auto-set max tickets defaults when type changes
            if (name === 'eventType') {
                updates.maxTicketsPerUser = value === 'solo' ? 4 : 10;
            }
            return { ...prev, ...updates };
        });
    };

    if (verifying) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
                <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Checking verification status...</div>
            </div>
        );
    }

    return (
        <div className="create-event-container">
            <button
                onClick={() => navigate(-1)}
                className="back-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ArrowLeft size={20} /> Back
            </button>
            <h1 className="page-title">{isEditing ? 'Edit Event' : 'Host an Event'}</h1>

            <form onSubmit={handleSubmit}>
                {/* Event Details Section */}
                <div className="form-section">
                    <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={24} /> Event Details</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Event Title</label>
                            <input
                                name="title"
                                value={formData.title}
                                placeholder="e.g. Saturday Night Board Games"
                                onChange={handleChange}
                                required
                                className="input-field"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                placeholder="What's the plan? Be descriptive!"
                                rows="4"
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>

                        <div className="form-grid two-col">
                            <div className="form-group">
                                <label className="form-label">Hobby Category</label>
                                <input
                                    name="hobby"
                                    value={formData.hobby}
                                    placeholder="Games, Sports, Tech"
                                    onChange={handleChange}
                                    required
                                    className="input-field"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">City</label>
                                <input
                                    name="city"
                                    value={formData.city}
                                    placeholder="e.g. New York"
                                    onChange={handleChange}
                                    required
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location Section */}
                <div className="form-section">
                    <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={24} /> Location & Time</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Venue / Meeting Point (Search)</label>
                            <input
                                ref={venueInputRef}
                                name="venue"
                                // Uncontrolled input to allow Google Places to manage it without React lag
                                defaultValue={formData.venue}
                                placeholder="Start typing a location..."
                                onBlur={(e) => {
                                    // Capture manual input when user leaves field
                                    const val = e.target.value;
                                    setFormData(prev => ({ ...prev, venue: val }));
                                }}
                                required
                                className="input-field"
                            />
                            {formData.address && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {formData.address}
                                </div>
                            )}
                        </div>

                        <div className="form-grid two-col">
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={formData.date ? formData.date.split('T')[0] : ''}
                                    onChange={(e) => {
                                        const newDate = e.target.value;
                                        const timePart = formData.date ? formData.date.split('T')[1] : '12:00';
                                        setFormData({ ...formData, date: `${newDate}T${timePart}` });
                                    }}
                                    required
                                    className="input-field"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Time</label>
                                <input
                                    type="time"
                                    value={formData.date ? formData.date.split('T')[1]?.slice(0, 5) : ''}
                                    onChange={(e) => {
                                        const newTime = e.target.value;
                                        const d = new Date();
                                        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                        const datePart = formData.date ? formData.date.split('T')[0] : todayStr;
                                        setFormData({ ...formData, date: `${datePart}T${newTime}` });
                                    }}
                                    required
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Image size={24} /> Event Images</h2>
                    <div className="form-group">
                        <label className="form-label">Upload Photos (Max 5)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="input-field"
                            style={{ padding: '0.5rem' }}
                            disabled={formData.mediaUrls && formData.mediaUrls.length >= 5}
                            title={formData.mediaUrls && formData.mediaUrls.length >= 5 ? "Max 5 images reached" : "Upload image"}
                        />
                        {formData.mediaUrls && formData.mediaUrls.length > 0 && (
                            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                {formData.mediaUrls.map((url, index) => (
                                    <div key={index} style={{ position: 'relative', height: '150px' }}>
                                        <img
                                            src={url}
                                            alt={`Preview ${index}`}
                                            style={{ height: '100%', width: 'auto', borderRadius: '8px', border: '1px solid #ddd' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(index)}
                                            style={{
                                                position: 'absolute', top: '-8px', right: '-8px',
                                                background: 'var(--danger)', color: 'white', border: '2px solid white', borderRadius: '50%',
                                                width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}
                                            title="Remove image"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {formData.mediaUrls ? formData.mediaUrls.length : 0}/5 images uploaded.
                        </p>
                    </div>
                </div>

                {/* Settings Section */}
                <div className="form-section">
                    <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={24} /> Settings & Type</h2>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="form-label" style={{ marginBottom: '1rem' }}>Event Type</label>
                        <div className="selection-grid">
                            <label className="selection-card">
                                <input
                                    type="radio"
                                    name="eventType"
                                    value="solo"
                                    checked={formData.eventType === 'solo'}
                                    onChange={handleChange}
                                />
                                <div className="card-content">
                                    <div className="card-icon"><User size={24} /></div>
                                    <div className="card-title">Solo Event</div>
                                    <div className="card-desc">Individual participation only.</div>
                                </div>
                            </label>
                            <label className="selection-card">
                                <input
                                    type="radio"
                                    name="eventType"
                                    value="group"
                                    checked={formData.eventType === 'group'}
                                    onChange={handleChange}
                                />
                                <div className="card-content">
                                    <div className="card-icon"><Users size={24} /></div>
                                    <div className="card-title">Group Event</div>
                                    <div className="card-desc">Allow guests and teams.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="form-grid two-col">
                        <div className="form-group">
                            <label className="form-label">Max Participants</label>
                            <input
                                name="maxParticipants"
                                type="number"
                                min="2"
                                value={formData.maxParticipants}
                                onChange={handleChange}
                                required
                                className="input-field"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Price (₹)</label>
                            <input
                                name="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.price || 0}
                                onChange={handleChange}
                                required
                                className="input-field"
                            />
                            <div className="helper-text">Set to 0 for free events</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="allowCancellation"
                                checked={formData.allowCancellation !== false}
                                onChange={(e) => setFormData({ ...formData, allowCancellation: e.target.checked })}
                                style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }}
                            />
                            <span style={{ color: 'var(--text-primary)' }}>Allow participants to cancel their registration</span>
                        </label>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn btn-lg" disabled={uploading}>
                        {uploading ? 'Processing...' : (isEditing ? 'Save Changes' : 'Create Event')}
                    </button>
                    {isEditing && (
                        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary btn-lg">
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
