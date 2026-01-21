import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNavigate, useParams } from 'react-router-dom';

export default function CreateEventPage() {
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
                    alert('Your host verification is pending approval.');
                    navigate('/');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        console.log("Starting upload process...");
        try {
            let uploadedUrls = formData.mediaUrls || [];

            // Upload Logic DISABLED
            /*
            if (mediaFiles.length > 0) {
                console.log(`Uploading ${mediaFiles.length} files...`);
                // Import storage functions (ensure these are imported at top or here if lazy)
                // Switched to dynamic import of SDK functions only, assuming 'storage' instance is available or imported.
                // Actually, let's use the static import from firebase.js if possible, but we need to import it at top.
                // For now, let's stick to cleaning this up.
                const { storage } = await import('../firebase');
                const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");

                const uploadPromises = mediaFiles.map(async (file) => {
                    try {
                        console.log(`Uploading file: ${file.name}`);
                        const uniquePath = `events/${Date.now()}_${Math.random().toString(36).substr(2, 9)}/${file.name}`;
                        const storageRef = ref(storage, uniquePath);
                        await uploadBytes(storageRef, file);
                        console.log(`File uploaded: ${file.name}, getting URL...`);
                        const url = await getDownloadURL(storageRef);
                        console.log(`Got URL for ${file.name}: ${url}`);
                        return url;
                    } catch (uploadErr) {
                        console.error(`Error uploading ${file.name}:`, uploadErr);
                        throw uploadErr;
                    }
                });

                const newUrls = await Promise.all(uploadPromises);
                uploadedUrls = [...uploadedUrls, ...newUrls];
            }
            */

            console.log("Saving event data...");
            const finalData = { ...formData, mediaUrls: uploadedUrls };

            if (isEditing) {
                await api.updateEvent(id, finalData);
                alert('Event updated successfully!');
                navigate(`/events/${id}`);
            } else {
                await api.createEvent(finalData);
                navigate('/');
            }
        } catch (error) {
            console.error("Submit Error:", error);
            alert('Failed to save event. ' + error.message);
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
            >
                <span>←</span> Back
            </button>
            <h1 className="page-title">{isEditing ? 'Edit Event' : 'Host an Event'}</h1>

            <form onSubmit={handleSubmit}>
                {/* Event Details Section */}
                <div className="form-section">
                    <h2 className="section-title">📅 Event Details</h2>
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
                    <h2 className="section-title">📍 Location & Time</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Venue / Meeting Point (Search)</label>
                            <input
                                ref={venueInputRef}
                                name="venue"
                                // Uncontrolled input to allow Google Places to manage it without React lag
                                defaultValue={formData.venue}
                                placeholder="Start typing a location..."
                                onChange={handleChange}
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

                {/* Settings Section */}
                <div className="form-section">
                    <h2 className="section-title">⚙️ Settings & Type</h2>

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
                                    <div className="card-icon">👤</div>
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
                                    <div className="card-icon">👥</div>
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
                            <label className="form-label">Price ($)</label>
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
