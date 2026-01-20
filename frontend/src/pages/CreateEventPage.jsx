import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNavigate, useParams } from 'react-router-dom';

export default function CreateEventPage() {
    const [formData, setFormData] = useState({
        title: '', description: '', city: '', hobby: '', venue: '', date: '', maxParticipants: 10
    });
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;
    const [verifying, setVerifying] = useState(true);

    useEffect(() => {
        // Enforce Verification
        const checkVerification = async () => {
            try {
                const res = await api.getProfile();
                if (res.data.isVerified) {
                    setVerifying(false);
                } else if (res.data.verificationStatus === 'pending') {
                    alert('Your host verification is pending approval.');
                    navigate('/');
                } else {
                    // Not verified, go to plans
                    navigate('/plans');
                }
            } catch (err) {
                console.error("Profile check failed", err);
                navigate('/'); // Fail safe
            }
        };
        checkVerification();

        if (isEditing) {
            api.getEvent(id).then(res => {
                const data = res.data;
                // Format date for datetime-local input (YYYY-MM-DDThh:mm)
                // ... logic same as before ...
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
                    date: dateStr,
                    maxParticipants: data.maxParticipants,
                    allowCancellation: data.allowCancellation
                });
            }).catch(err => {
                console.error(err);
                alert('Failed to load event details');
            });
        }
    }, [id, isEditing, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.updateEvent(id, formData);
                alert('Event updated successfully!');
                navigate(`/events/${id}`);
            } else {
                await api.createEvent(formData);
                navigate('/');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to save event');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (verifying) {
        return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Checking verification status...</div>;
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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
            <h1 className="page-title">{isEditing ? 'Edit Event' : 'Host an Event'}</h1>
            <div className="card">
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Title</label>
                        <input name="title" value={formData.title} placeholder="e.g. Saturday Night Board Games" onChange={handleChange} required className="input-field" />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
                        <textarea name="description" value={formData.description} placeholder="What's the plan?" rows="4" onChange={handleChange} className="input-field" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>City</label>
                            <input name="city" value={formData.city} placeholder="New York" onChange={handleChange} required className="input-field" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Hobby Category</label>
                            <input name="hobby" value={formData.hobby} placeholder="Games, Sports, Tech" onChange={handleChange} required className="input-field" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Venue</label>
                            <input name="venue" value={formData.venue} placeholder="Central Park" onChange={handleChange} required className="input-field" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date</label>
                                <input
                                    type="date"
                                    min={(() => {
                                        const d = new Date();
                                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                    })()}
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
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Time</label>
                                <input
                                    type="time"
                                    min={(() => {
                                        if (!formData.date) return '';
                                        const d = new Date();
                                        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                        const selectedDate = formData.date.split('T')[0];
                                        return selectedDate === todayStr ? d.toTimeString().slice(0, 5) : '';
                                    })()}
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

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Max Participants</label>
                        <input name="maxParticipants" type="number" min="2" value={formData.maxParticipants} onChange={handleChange} required className="input-field" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            name="allowCancellation"
                            checked={formData.allowCancellation !== false}
                            onChange={(e) => setFormData({ ...formData, allowCancellation: e.target.checked })}
                            id="allowCancellation"
                        />
                        <label htmlFor="allowCancellation" style={{ cursor: 'pointer' }}>Allow participants to leave event (cancellation)</label>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn" style={{ flex: 1 }}>{isEditing ? 'Save Changes' : 'Create Event'}</button>
                        {isEditing && (
                            <button type="button" onClick={() => navigate(-1)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
