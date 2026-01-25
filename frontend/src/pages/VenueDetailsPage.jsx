import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MapPin, Users, Calendar, Clock, CheckCircle } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

function BookingModal({ venue, onClose }) {
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState({
        event_name: '',
        date: '',
        start_time: '',
        end_time: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.requestVenueBooking(venue.id, {
                ...formData,
                user_id: currentUser.uid,
                user_email: currentUser.email
            });
            alert("Booking request sent successfully!");
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to send booking request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Request to Book {venue.name}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label className="form-label">Event Name</label>
                        <input
                            required
                            className="form-input"
                            value={formData.event_name}
                            onChange={e => setFormData({ ...formData, event_name: e.target.value })}
                        />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            required
                            className="form-input"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-field">
                            <label className="form-label">Start Time</label>
                            <input
                                type="time"
                                required
                                className="form-input"
                                value={formData.start_time}
                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div className="form-field">
                            <label className="form-label">End Time</label>
                            <input
                                type="time"
                                required
                                className="form-input"
                                value={formData.end_time}
                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Sending...' : 'Send Request'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function VenueDetailsPage() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showDialog } = useDialog();
    const [showBookingModal, setShowBookingModal] = useState(false);

    useEffect(() => {
        api.getVenueDetails(id)
            .then(res => setVenue(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="container">Loading...</div>;
    if (!venue) return <div className="container">Venue not found</div>;

    return (
        <div className="container fade-in">
            <button
                onClick={() => navigate(-1)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-secondary)', marginBottom: '1rem',
                    padding: 0, fontSize: '1rem'
                }}
            >
                <ArrowLeft size={20} /> Back
            </button>

            {/* Hero Image */}
            <div style={{
                height: '400px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                marginBottom: '2rem',
                position: 'relative'
            }}>
                <img
                    src={venue.images?.[0] || 'https://via.placeholder.com/1200x400?text=Venue+Image'}
                    alt={venue.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '2rem',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    color: 'white'
                }}>
                    <h1 style={{ marginBottom: '0.5rem' }}>{venue.name}</h1>
                    <div style={{ display: 'flex', gap: '1.5rem', opacity: 0.9 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={18} /> {venue.location}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>₹{venue.price_per_hour}/hr</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Main Content */}
                <div>
                    <section className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                        <h2 style={{ marginBottom: '1rem' }}>About this space</h2>
                        <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>{venue.description || "No description provided."}</p>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '50%' }}>
                                    <Users size={24} color="var(--primary)" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>Capacity</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{venue.capacity} People</div>
                                </div>
                            </div>
                            {venue.catering && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '50%' }}>
                                        <CheckCircle size={24} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Catering</div>
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                            {venue.catering === 'in_house' && 'In-house Available'}
                                            {venue.catering === 'outside_allowed' && 'Outside Allowed'}
                                            {venue.catering === 'no_food' && 'No Food Allowed'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {venue.amenities && venue.amenities.length > 0 && (
                            <div style={{ marginTop: '2rem' }}>
                                <h3>Amenities</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                    {venue.amenities.map(amenity => (
                                        <div key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <CheckCircle size={16} color="var(--accent)" />
                                            <span>{amenity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                            <h3>Location & Contact</h3>
                            <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <MapPin size={20} color="var(--text-secondary)" />
                                    <span>{venue.location}, {venue.city}</span>
                                </div>
                                {(venue.contact_email || venue.contact_phone) && (
                                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                        {venue.contact_email && <div>Email: <a href={`mailto:${venue.contact_email}`} style={{ color: 'var(--primary)' }}>{venue.contact_email}</a></div>}
                                        {venue.contact_phone && <div>Phone: <a href={`tel:${venue.contact_phone}`} style={{ color: 'var(--primary)' }}>{venue.contact_phone}</a></div>}
                                    </div>
                                )}
                                {venue.website && (
                                    <div>
                                        Website: <a href={venue.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>{venue.website}</a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar */}
                <div>
                    <div className="card" style={{ padding: '2rem', position: 'sticky', top: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Interested in hosting?</h3>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Hourly Rate</span>
                                <span style={{ fontWeight: 600 }}>₹{venue.price_per_hour}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Cleaning Fee</span>
                                <span style={{ fontWeight: 600 }}>₹1000 (Est.)</span>
                            </div>
                        </div>

                        {currentUser ? (
                            currentUser.uid === venue.owner_id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>
                                        You own this venue.
                                    </div>
                                    <button
                                        onClick={() => navigate(`/venues/${venue.id}/edit`)}
                                        className="btn-secondary"
                                        style={{ width: '100%', justifyContent: 'center' }}
                                    >
                                        Edit Details
                                    </button>
                                    <button
                                        onClick={() => {
                                            showDialog({
                                                title: 'Delete Venue',
                                                message: 'Are you sure you want to delete this venue? This action cannot be undone.',
                                                type: 'confirm',
                                                onConfirm: async () => {
                                                    try {
                                                        await api.deleteVenue(venue.id);
                                                        alert("Venue deleted.");
                                                        navigate('/venues');
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Failed to delete venue: " + (err.response?.data?.error || err.message));
                                                    }
                                                }
                                            });
                                        }}
                                        className="btn-secondary"
                                        style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                    >
                                        Delete Venue
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowBookingModal(true)}
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                >
                                    Request to Host Event
                                </button>
                            )
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                            >
                                Login to Request
                            </button>
                        )}

                        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            {currentUser && currentUser.uid === venue.owner_id ? 'Manage your venue in Dashboard.' : "You won't be charged yet."}
                        </p>
                    </div>
                </div>
            </div>

            {showBookingModal && (
                <BookingModal
                    venue={venue}
                    onClose={() => setShowBookingModal(false)}
                />
            )}
        </div>
    );
}
