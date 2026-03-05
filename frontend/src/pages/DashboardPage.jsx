import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { MapPin, Tag, Plus, User, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function DashboardPage() {
    const { currentUser, userProfile } = useAuth();
    const [hosted, setHosted] = useState([]);
    const [joined, setJoined] = useState([]);
    const [venues, setVenues] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsError, setAnalyticsError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('hosted');
    const navigate = useNavigate();
    const { showDialog } = useDialog();

    // Booking management state
    const [incomingBookings, setIncomingBookings] = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [rejectModal, setRejectModal] = useState({ open: false, bookingId: null });
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    const handleHostEvent = (e) => {
        e.preventDefault();
        if (userProfile?.isVerifiedHost) {
            navigate('/events/new');
        } else {
            showDialog({
                title: 'Verification Required',
                message: 'You need to be a verified host to create an event.',
                type: 'confirm',
                onConfirm: () => navigate('/verification')
            });
        }
    };

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                // Always fetch these 5
                const [hostedRes, joinedRes, wishlistRes, venuesRes, myBookingsRes] = await Promise.all([
                    api.getHostedEvents(),
                    api.getJoinedEvents(),
                    api.getWishlist(),
                    api.getMyVenues(),
                    api.getMyBookings().catch(() => ({ data: { data: [] } })),
                ]);

                setHosted(hostedRes.data);
                setJoined(joinedRes.data);
                setWishlist(wishlistRes.data);
                setVenues(venuesRes.data);
                setMyBookings(myBookingsRes.data?.data || []);

                // Conditionally fetch analytics for verified hosts
                if (userProfile?.isVerifiedHost) {
                    try {
                        const analyticsRes = await api.getHostAnalytics();
                        setAnalytics(analyticsRes.data);
                    } catch (e) {
                        console.error("Host Analytics Error:", e);
                        setAnalyticsError(e.response?.data?.error || e.message || "Failed to load analytics");
                    }
                }

                // Fetch incoming bookings if user owns venues or is admin
                const ownsVenues = venuesRes.data && venuesRes.data.length > 0;
                if (ownsVenues || userProfile?.role === 'admin') {
                    try {
                        const incomingRes = await api.getIncomingBookings();
                        setIncomingBookings(incomingRes.data?.data || []);
                    } catch (e) {
                        console.error("Incoming bookings error:", e);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [userProfile]);

    const handleDelete = async (id) => {
        showDialog({
            title: 'Delete Event',
            message: 'Are you sure you want to delete this event? This action cannot be undone.',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await api.deleteEvent(id);
                    setHosted(prev => prev.filter(e => e.id !== id));
                    showDialog({ title: 'Success', message: 'Event deleted successfully', type: 'success' });
                } catch (err) {
                    showDialog({ title: 'Error', message: 'Failed to delete event: ' + err.message, type: 'error' });
                }
            }
        });
    };

    const handleRemoveFromWishlist = async (itemId) => {
        showDialog({
            title: 'Remove from Wishlist',
            message: 'Remove this item from your wishlist?',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await api.removeFromWishlist(itemId);
                    setWishlist(prev => prev.filter(item => item.id !== itemId));
                } catch (err) {
                    showDialog({ title: 'Error', message: 'Failed to remove from wishlist', type: 'error' });
                    console.error(err);
                }
            }
        });
    };

    // Booking actions
    const handleApproveBooking = async (bookingId) => {
        setActionLoading(bookingId);
        try {
            await api.approveBooking(bookingId);
            setIncomingBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'approved' } : b));
            showDialog({ title: 'Success', message: 'Booking approved!', type: 'success' });
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to approve';
            showDialog({ title: 'Error', message: errorMsg, type: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectBooking = async () => {
        if (!rejectReason.trim()) {
            showDialog({ title: 'Required', message: 'Please provide a reason for rejection.', type: 'alert' });
            return;
        }
        const bookingId = rejectModal.bookingId;
        setActionLoading(bookingId);
        try {
            await api.rejectBooking(bookingId, rejectReason.trim());
            setIncomingBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'rejected', rejection_reason: rejectReason.trim() } : b));
            setRejectModal({ open: false, bookingId: null });
            setRejectReason('');
            showDialog({ title: 'Done', message: 'Booking rejected.', type: 'success' });
        } catch (err) {
            showDialog({ title: 'Error', message: err.response?.data?.error || 'Failed to reject', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        showDialog({
            title: 'Cancel Booking',
            message: 'Are you sure you want to cancel this booking request?',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await api.cancelBooking(bookingId);
                    setMyBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
                    showDialog({ title: 'Done', message: 'Booking cancelled.', type: 'success' });
                } catch (err) {
                    showDialog({ title: 'Error', message: err.response?.data?.error || 'Failed to cancel', type: 'error' });
                }
            }
        });
    };

    const handlePayVenueBooking = async (bookingId) => {
        setActionLoading(bookingId);
        try {
            // Load Razorpay Script
            const res = await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.body.appendChild(script);
            });

            if (!res) {
                showDialog({ title: 'Error', message: 'Failed to load payment gateway.', type: 'error' });
                return;
            }

            // Create Order
            const orderRes = await api.createVenuePaymentOrder(bookingId);
            const { order_id, amount, currency, is_mock } = orderRes.data;

            if (is_mock) {
                // Bypass Razorpay UI for mock mode
                await api.verifyVenuePayment(bookingId, {
                    razorpay_payment_id: 'mock_payment_' + Math.floor(Math.random() * 1000000),
                    razorpay_order_id: order_id,
                    razorpay_signature: 'mock_signature'
                });
                setMyBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b));
                showDialog({ title: 'Success', message: 'Mock payment successful! Booking confirmed.', type: 'success' });
                return;
            }

            // Real Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'dummy_key',
                amount: amount,
                currency: currency,
                name: 'Huddle Venues',
                description: 'Venue Booking Payment',
                order_id: order_id,
                prefill: {
                    name: userProfile?.displayName || '',
                    email: userProfile?.email || '',
                },
                handler: async function (response) {
                    try {
                        showDialog({ title: 'Processing', message: 'Verifying payment...', type: 'alert' });
                        await api.verifyVenuePayment(bookingId, response);
                        setMyBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b));
                        showDialog({ title: 'Success!', message: 'Payment verified and booking confirmed.', type: 'success' });
                    } catch (verifyErr) {
                        showDialog({ title: 'Error', message: 'Payment verification failed.', type: 'error' });
                    }
                },
                theme: { color: '#4F46E5' }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                showDialog({ title: 'Payment Failed', message: response.error.description, type: 'error' });
            });
            rzp.open();

        } catch (err) {
            console.error("Payment error:", err);
            showDialog({ title: 'Error', message: err.response?.data?.error || 'Payment initialization failed', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    // Status badge helper
    const StatusBadge = ({ status }) => {
        const styles = {
            pending: { bg: '#FEF3C7', color: '#92400E', icon: <Clock size={12} /> },
            approved: { bg: '#D1FAE5', color: '#065F46', icon: <CheckCircle size={12} /> },
            rejected: { bg: '#FEE2E2', color: '#991B1B', icon: <XCircle size={12} /> },
            cancelled: { bg: '#F3F4F6', color: '#6B7280', icon: <XCircle size={12} /> },
            payment_pending: { bg: '#DBEAFE', color: '#1E40AF', icon: <AlertCircle size={12} /> },
            confirmed: { bg: '#D1FAE5', color: '#065F46', icon: <CheckCircle size={12} /> },
            completed: { bg: '#E0E7FF', color: '#3730A3', icon: <CheckCircle size={12} /> },
        };
        const s = styles[status] || styles.pending;
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.6rem', borderRadius: '1rem',
                background: s.bg, color: s.color,
                fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
                {s.icon} {status.replace('_', ' ')}
            </span>
        );
    };

    if (loading) return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Loading Dashboard...</div>
        </div>
    );

    const EventList = ({ events, isHosted }) => {
        if (events.length === 0) return (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px dashed var(--border-color)' }}>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    {isHosted ? "You haven't hosted any events yet." : "You haven't joined any events yet."}
                </p>
                {isHosted ? (
                    <button onClick={handleHostEvent} className="btn" style={{ fontSize: '1rem', cursor: 'pointer' }}>Create Your First Event</button>
                ) : (
                    <Link to="/" className="btn">Browse Events</Link>
                )}
            </div>
        );

        return (
            <div className="event-grid">
                {events.map(event => (
                    <div key={event.id} className="card event-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            height: '140px',
                            background: 'linear-gradient(to right, #1E293B, #334155)',
                            borderRadius: 'var(--radius) var(--radius) 0 0',
                            margin: '-1.5rem -1.5rem 1rem -1.5rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {event.mediaUrls && event.mediaUrls.length > 0 && (
                                <img src={event.mediaUrls[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            )}
                            <div style={{
                                position: 'absolute', top: '1rem', right: '1rem',
                                background: 'rgba(0,0,0,0.6)', color: 'white',
                                padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem'
                            }}>
                                {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        </div>

                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{event.title}</h3>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} /> {event.city}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Tag size={14} /> {event.hobby}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: isHosted ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
                            <Link to={`/events/${event.id}`} className="btn-secondary" style={{ justifyContent: 'center' }}>
                                View Details
                            </Link>
                            {isHosted && (
                                <Link to={`/events/${event.id}/edit`} className="btn-secondary" style={{ justifyContent: 'center' }}>
                                    Edit
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const VenueList = ({ venues }) => {
        if (venues.length === 0) return (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px dashed var(--border-color)' }}>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    You haven't listed any venues yet.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Link to="/venues/new" className="btn">List Your Venue</Link>
                </div>
            </div >
        );

        return (
            <div className="event-grid">
                {venues.map(venue => (
                    <div key={venue.id} className="card event-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            height: '140px',
                            background: 'linear-gradient(to right, #1E293B, #334155)',
                            borderRadius: 'var(--radius) var(--radius) 0 0',
                            margin: '-1.5rem -1.5rem 1rem -1.5rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <img src={venue.images?.[0] || 'https://via.placeholder.com/400x200'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>

                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{venue.name}</h3>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} /> {venue.location}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14} /> Capacity: {venue.capacity}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                            <Link to={`/venues/${venue.id}`} className="btn-secondary" style={{ justifyContent: 'center' }}>
                                View Details
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Booking card component for both owner and requester views
    const BookingCard = ({ booking, isOwnerView }) => (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{booking.event_name}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {booking.venue_name || 'Venue'}
                    </p>
                </div>
                <StatusBadge status={booking.status} />
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Calendar size={14} /> {booking.date}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={14} /> {booking.start_time} – {booking.end_time}
                </span>
            </div>

            {booking.rejection_reason && (
                <div style={{ background: '#FEF2F2', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem', color: '#991B1B' }}>
                    <strong>Reason:</strong> {booking.rejection_reason}
                </div>
            )}

            {/* Owner actions */}
            {isOwnerView && booking.status === 'pending' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                        className="btn"
                        style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem' }}
                        onClick={() => handleApproveBooking(booking.id)}
                        disabled={actionLoading === booking.id}
                    >
                        {actionLoading === booking.id ? 'Processing...' : '✓ Approve'}
                    </button>
                    <button
                        className="btn-secondary"
                        style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        onClick={() => { setRejectModal({ open: true, bookingId: booking.id }); setRejectReason(''); }}
                        disabled={actionLoading === booking.id}
                    >
                        ✕ Reject
                    </button>
                </div>
            )}

            {/* Requester cancel action */}
            {!isOwnerView && ['pending', 'approved', 'payment_pending', 'confirmed'].includes(booking.status) && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {booking.status === 'payment_pending' && (
                        <button
                            className="btn"
                            style={{ flex: 1, fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                            onClick={() => handlePayVenueBooking(booking.id)}
                            disabled={actionLoading === booking.id}
                        >
                            {actionLoading === booking.id ? <Loader2 size={14} className="spin" /> : 'Pay Now'}
                        </button>
                    )}
                    <button
                        className="btn-secondary"
                        style={{ flex: booking.status === 'payment_pending' ? 1 : 'none', fontSize: '0.85rem', padding: '0.4rem 0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)', alignSelf: 'flex-start' }}
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={actionLoading === booking.id}
                    >
                        Cancel Booking
                    </button>
                </div>
            )}
        </div>
    );

    const hasVenueBookingsTab = venues.length > 0 || incomingBookings.length > 0;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            {/* Header */}
            <div className="dashboard-header">
                <div className="container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>Welcome, {currentUser?.displayName || 'User'}!</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>Manage your events, venues, and upcoming plans.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {userProfile?.role === 'admin' && (
                                <Link to="/admin" className="btn-secondary">
                                    Admin Dashboard
                                </Link>
                            )}
                            <button onClick={handleHostEvent} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', fontSize: '1rem', cursor: 'pointer' }}>
                                <Plus size={18} /> New Event
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container">
                {/* Tabs */}
                <div className="dashboard-tabs" style={{ flexWrap: 'wrap' }}>
                    {userProfile?.isVerifiedHost && (
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            Overview
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('hosted')}
                        className={`tab-btn ${activeTab === 'hosted' ? 'active' : ''}`}
                    >
                        Hosted Events ({hosted.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('joined')}
                        className={`tab-btn ${activeTab === 'joined' ? 'active' : ''}`}
                    >
                        Attending ({joined.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('venues')}
                        className={`tab-btn ${activeTab === 'venues' ? 'active' : ''}`}
                    >
                        My Venues ({venues.length})
                    </button>
                    {hasVenueBookingsTab && (
                        <button
                            onClick={() => setActiveTab('venue_bookings')}
                            className={`tab-btn ${activeTab === 'venue_bookings' ? 'active' : ''}`}
                        >
                            Venue Bookings ({incomingBookings.filter(b => b.status === 'pending').length})
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('my_bookings')}
                        className={`tab-btn ${activeTab === 'my_bookings' ? 'active' : ''}`}
                    >
                        My Bookings ({myBookings.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('wishlist')}
                        className={`tab-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
                    >
                        My Wishlist ({wishlist.length})
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'hosted' && (
                    <EventList events={hosted} isHosted={true} />
                )}
                {activeTab === 'joined' && (
                    <EventList events={joined} isHosted={false} />
                )}
                {activeTab === 'venues' && (
                    <VenueList venues={venues} />
                )}

                {/* Venue Bookings — Owner View */}
                {activeTab === 'venue_bookings' && (
                    <>
                        {incomingBookings.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px dashed var(--border-color)' }}>
                                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>No booking requests yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
                                {incomingBookings.map(b => (
                                    <BookingCard key={b.id} booking={b} isOwnerView={true} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* My Bookings — Requester View */}
                {activeTab === 'my_bookings' && (
                    <>
                        {myBookings.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px dashed var(--border-color)' }}>
                                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>You haven't booked any venues yet.</p>
                                <Link to="/venues" className="btn" style={{ marginTop: '1rem', display: 'inline-block' }}>Browse Venues</Link>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
                                {myBookings.map(b => (
                                    <BookingCard key={b.id} booking={b} isOwnerView={false} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'wishlist' && (
                    <>
                        {wishlist.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px dashed var(--border-color)' }}>
                                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Your wishlist is empty.</p>
                                <Link to="/" className="btn" style={{ marginTop: '1rem', display: 'inline-block' }}>Explore Events</Link>
                            </div>
                        ) : (
                            <div className="event-grid">
                                {wishlist.map(item => (
                                    <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '4px',
                                                    background: item.type === 'host' ? '#EEF2FF' : '#F0FDF4',
                                                    color: item.type === 'host' ? '#4F46E5' : '#16A34A',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    {item.type === 'host' ? 'FAVORITE HOST' : 'SAVED VENUE'}
                                                </span>
                                                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{item.name}</h3>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveFromWishlist(item.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
                                                title="Remove"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        {item.details && (
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                {item.details.eventName && <div style={{ marginBottom: '0.25rem' }}>From: <strong>{item.details.eventName}</strong></div>}
                                                {item.details.eventCity && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} /> {item.details.eventCity}</div>}
                                            </div>
                                        )}

                                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                            {item.type === 'host' ? (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    Get notified when they host next!
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    Saved for your future events.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'analytics' && (
                    <>
                        {analyticsError ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem', borderColor: '#ef4444' }}>
                                <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{analyticsError}</p>
                                <button className="btn-secondary" onClick={() => window.location.reload()}>Retry</button>
                            </div>
                        ) : analytics ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                                    <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>{analytics.activeEvents}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Active Events</div>
                                </div>
                                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                                    <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10B981', marginBottom: '0.5rem' }}>{analytics.totalTicketsSold}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Tickets Sold</div>
                                </div>
                                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                                    <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#F59E0B', marginBottom: '0.5rem' }}>₹{(analytics.totalRevenue || 0).toLocaleString()}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Total Revenue</div>
                                </div>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Rejection Reason Modal */}
            {rejectModal.open && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }} onClick={() => setRejectModal({ open: false, bookingId: null })}>
                    <div style={{
                        background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)',
                        width: '420px', maxWidth: '90%', border: '1px solid var(--border-color)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 1rem 0' }}>Reject Booking</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            Please provide a reason for rejection. This will be shared with the requester.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g., Venue is under renovation on that date..."
                            className="input-field"
                            rows="3"
                            style={{ width: '100%', marginBottom: '1rem', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                className="btn"
                                onClick={handleRejectBooking}
                                disabled={actionLoading}
                                style={{ flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)' }}
                            >
                                {actionLoading ? 'Rejecting...' : 'Reject'}
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => setRejectModal({ open: false, bookingId: null })}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

