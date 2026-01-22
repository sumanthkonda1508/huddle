import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import SEO from '../components/SEO';

export default function EventDetailsPage() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [bookingData, setBookingData] = useState({ count: 1, guests: [] });
    const [bookingStep, setBookingStep] = useState(1); // 1: Count, 2: Details
    const navigate = useNavigate();
    const { showDialog } = useDialog();
    const [showAttendeesModal, setShowAttendeesModal] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [attendees, setAttendees] = useState([]);

    // Booking information was duplicated, cleaning up

    // ... refreshEntry ... 

    useEffect(() => {
        if (showAttendeesModal) {
            api.getParticipants(id)
                .then(res => setAttendees(res.data))
                .catch(err => console.error(err));
        }
    }, [showAttendeesModal, id]);

    const handleKickUser = async (userId) => {
        showDialog({
            title: 'Remove User',
            message: 'Are you sure you want to remove this user from the event?',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await api.removeParticipant(id, userId);
                    setAttendees(prev => prev.filter(u => u.uid !== userId));
                    refreshEntry();
                } catch (err) {
                    console.error(err);
                    showDialog({ title: 'Error', message: 'Failed to remove user', type: 'error' });
                }
            }
        });
    };

    const refreshEntry = () => {
        api.getEvent(id).then(res => setEvent(res.data));
        api.getComments(id).then(res => setComments(res.data));
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.getEvent(id),
            api.getComments(id)
        ])
            .then(([eventRes, commentsRes]) => {
                setEvent(eventRes.data);
                setComments(commentsRes.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            await api.addComment(id, newComment);
            setNewComment('');
            // Optimistic update or refresh? Refresh is safer for ID.
            refreshEntry();
        } catch (error) {
            console.error(error);
            showDialog({ title: 'Error', message: 'Failed to post comment', type: 'error' });
        }
    };

    const joinEvent = async (guests = []) => {
        try {
            await api.joinEvent(id, { guests }); // Pass guests to API
            setShowBookingModal(false);
            setBookingData({ count: 1, guests: [] });
            setBookingStep(1);
            refreshEntry();
            showDialog({ title: 'Success', message: 'Joined successfully!', type: 'success' });
        } catch (err) {
            showDialog({ title: 'Error', message: err.response?.data?.error || 'Failed to join', type: 'error' });
        }
    };

    const handleJoinClick = () => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        // Always open booking modal now, as Solo also allows guests (max 4)
        setShowBookingModal(true);
    };

    const leaveEvent = async () => {
        try {
            await api.leaveEvent(id);
            refreshEntry();
        } catch (err) {
            showDialog({ title: 'Error', message: err.response?.data?.error || 'Failed to leave', type: 'error' });
        }
    }

    const handleWishlist = async (type) => {
        try {
            const item = {
                type,
                targetId: type === 'host' ? event.hostId : event.venue, // Using venue name as ID since we don't have venue entities
                name: type === 'host' ? (event.hostName || 'Event Host') : event.venue, // Placeholder name if host details missing, fetched typically
                details: {
                    eventName: event.title,
                    eventCity: event.city
                }
            };
            await api.addToWishlist(item);
            showDialog({ title: 'Success', message: `Added ${type === 'host' ? 'Host' : 'Venue'} to wishlist!`, type: 'success' });
        } catch (err) {
            console.error(err);
            showDialog({ title: 'Error', message: 'Failed to add to wishlist', type: 'error' });
        }
    };

    const handleDelete = async () => {
        showDialog({
            title: 'Cancel Event',
            message: 'Are you sure you want to cancel this event? This action cannot be undone.',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await api.deleteEvent(id);
                    navigate('/');
                } catch (err) {
                    showDialog({ title: 'Error', message: 'Failed to delete event', type: 'error' });
                }
            }
        });
    };

    if (loading) return <div>Loading...</div>;
    if (!event) return <div>Event not found</div>;

    const handleDeleteComment = async (commentId) => {
        showDialog({
            title: 'Delete Comment',
            message: 'Are you sure you want to delete this comment?',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await api.deleteComment(id, commentId);
                    refreshEntry();
                } catch (error) {
                    console.error(error);
                    showDialog({ title: 'Error', message: 'Failed to delete comment', type: 'error' });
                }
            }
        });
    };

    const isParticipant = event.participants?.includes(currentUser?.uid);
    // Use attendeeCount if available, else length
    const currentCount = event.attendeeCount !== undefined ? event.attendeeCount : event.participants?.length || 0;
    const isFull = currentCount >= event.maxParticipants;
    const isHost = currentUser && event.hostId === currentUser.uid;

    // Urgency Text
    const seatsTaken = currentCount;
    let urgencyText = "Selling Fast";
    if (isFull) urgencyText = "Sold Out";
    else if (seatsTaken >= event.maxParticipants * 0.8) urgencyText = "Hurry! Almost Full";

    const displayedAttendees = attendees.slice(0, 4);

    return (

        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            <SEO
                title={event.title}
                description={`${event.title} hosted by ${event.hostName || 'a community member'} in ${event.city}. Join now!`}
            />
            {/* Hero Header */}
            <div className="event-hero">
                <div className="back-nav">
                    <button onClick={() => navigate(-1)} className="back-nav-btn">
                        <span>←</span> Back
                    </button>
                </div>
                <div className="container" style={{ padding: 0 }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>{event.title}</h1>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', opacity: 0.9 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            📅 {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            👤 Hosted by {event.hostName || 'Unknown'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Split Layout */}
            <div className="event-details-layout">

                {/* Left Column: Main Info */}
                <div className="event-main-content">
                    {/* Maps & Location - Moved up for context */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 className="section-title">📍 Location</h3>
                        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{event.venue}, {event.city}</p>
                        <div style={{ width: '100%', height: '300px', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                style={{ border: 0 }}
                                src={`https://maps.google.com/maps?q=${event.coordinates ? (event.coordinates.lat + ',' + event.coordinates.lng) : encodeURIComponent(event.address || (event.venue + ', ' + event.city))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                allowFullScreen
                                loading="lazy"
                            ></iframe>
                        </div>
                    </div>

                    {/* About */}
                    <div style={{ marginBottom: '3rem' }}>
                        <h3 className="section-title">📝 About this Event</h3>
                        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '1.05rem' }}>
                            {event.description || 'No description provided.'}
                        </p>
                    </div>

                    {/* Gallery */}
                    {event.mediaUrls && event.mediaUrls.length > 0 && (
                        <div style={{ marginBottom: '3rem' }}>
                            <h3 className="section-title">📸 Gallery</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {event.mediaUrls.length === 1 ? (
                                    <img
                                        src={event.mediaUrls[0]}
                                        alt="Event media"
                                        style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}
                                        onClick={() => window.open(event.mediaUrls[0], '_blank')}
                                    />
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                        {event.mediaUrls.map((url, index) => (
                                            <img
                                                key={index}
                                                src={url}
                                                alt={`Event media ${index + 1}`}
                                                style={{ height: '200px', width: 'auto', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'transform 0.2s' }}
                                                onClick={() => window.open(url, '_blank')}
                                                onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Discussion */}
                    <div>
                        <h3 className="section-title">💬 Discussion ({comments.length})</h3>

                        {/* Post Comment Form - Moved to top of comments */}
                        {currentUser && (
                            <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white'
                                }}>
                                    {currentUser.displayName?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Ask a question or share your excitement..."
                                        rows="2"
                                        className="input-field"
                                        style={{ marginBottom: '0.5rem', resize: 'vertical' }}
                                    />
                                    <div style={{ textAlign: 'right' }}>
                                        <button type="submit" className="btn" disabled={!newComment.trim()}>Post</button>
                                    </div>
                                </div>
                            </form>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {comments.map(comment => (
                                <div key={comment.id} style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', flexShrink: 0
                                    }}>
                                        {comment.displayName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="comment-bubble" style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 'bold' }}>{comment.displayName}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p>{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Sidebar */}
                <div className="event-sidebar">
                    <div className="sidebar-card">
                        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {event.price > 0 ? `$${event.price}` : 'Free'}
                            </span>
                        </div>

                        {currentUser ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {isHost ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>You are the host</div>
                                        <Link to={`/events/${id}/edit`} className="btn-secondary" style={{ textAlign: 'center', width: '100%', justifyContent: 'center' }}>Edit Event</Link>
                                        <button
                                            onClick={handleDelete}
                                            className="btn-secondary"
                                            style={{ width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)', justifyContent: 'center' }}
                                        >
                                            🗑️ Delete Event
                                        </button>
                                    </div>
                                ) : isParticipant ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '1rem', fontSize: '1.1rem' }}>✓ You are going!</div>
                                        {event.allowCancellation !== false && (
                                            <button onClick={leaveEvent} style={{ color: 'var(--danger)', background: 'none', textDecoration: 'underline' }}>Leave Event</button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleJoinClick}
                                        className="btn"
                                        disabled={isFull}
                                        style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}
                                    >
                                        {isFull ? 'Sold Out' : (event.price > 0 ? 'Book Ticket' : 'Join Event')}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <Link to="/login" className="btn" style={{ width: '100%', textAlign: 'center' }}>Login to Join</Link>
                        )}

                        <div style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
                            <span style={{ color: isFull ? 'var(--danger)' : 'var(--primary)', fontWeight: '600' }}>
                                {urgencyText}
                            </span>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <span>👥</span>
                                <div>
                                    <strong>{currentCount}</strong> going <span style={{ color: 'var(--text-secondary)' }}>({event.maxParticipants} max)</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <span>🏷️</span>
                                <div>{event.hobby}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <span>🔗</span>
                                <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy Link</button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button onClick={() => handleWishlist('host')} className="btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}>
                                    ❤️ Save Host
                                </button>
                                <button onClick={() => handleWishlist('place')} className="btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}>
                                    📍 Save Venue
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* Attendees Widget */}
                    <div className="sidebar-card">
                        <h4 style={{ marginBottom: '1rem' }}>Who's Going?</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {displayedAttendees.map((u) => (
                                <div key={u.uid} title={u.displayName} style={{
                                    width: '40px', height: '40px', borderRadius: '50%', background: '#CBD5E1', border: '2px solid white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569'
                                }}>
                                    {u.displayName?.[0]}
                                </div>
                            ))}
                            {attendees.length > 4 && (
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', background: '#F1F5F9', border: '2px dashed #94A3B8',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#64748B'
                                }}>+{attendees.length - 4}</div>
                            )}
                        </div>
                        {attendees.length === 0 && <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Be the first to join!</span>}
                        {attendees.length > 0 && (
                            <button onClick={() => setShowAttendeesModal(true)} style={{ marginTop: '1rem', background: 'none', color: 'var(--accent)', fontSize: '0.9rem', width: '100%' }}>View All</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals placed outside layout flow */}
            {/* Booking Modal */}
            {showBookingModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }} onClick={() => setShowBookingModal(false)}>
                    <div style={{
                        background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)',
                        width: '400px', maxWidth: '90%',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Book Spot{bookingData.count > 1 ? 's' : ''}</h2>

                        {bookingStep === 1 ? (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>How many people (including you)?</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setBookingData({ ...bookingData, count: Math.max(1, bookingData.count - 1) })}
                                        disabled={bookingData.count <= 1}
                                        style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                    >
                                        -
                                    </button>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>{bookingData.count}</span>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => {
                                            const hostLimit = event.maxTicketsPerUser || (event.eventType === 'solo' ? 4 : 10);
                                            const maxAllowed = Math.min(hostLimit, event.maxParticipants - currentCount);

                                            if (bookingData.count < maxAllowed) {
                                                setBookingData({ ...bookingData, count: bookingData.count + 1 });
                                            }
                                        }}
                                        disabled={bookingData.count >= Math.min(
                                            event.maxTicketsPerUser || (event.eventType === 'solo' ? 4 : 10),
                                            event.maxParticipants - currentCount
                                        )}
                                        style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                    >
                                        +
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        className="btn"
                                        onClick={() => {
                                            if (bookingData.count === 1) joinEvent([]);
                                            else setBookingStep(2);
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        {bookingData.count === 1 ? 'Join Solo' : 'Next: Guest Details'}
                                    </button>
                                    <button className="btn-secondary" onClick={() => setShowBookingModal(false)} style={{ flex: 1 }}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p style={{ marginBottom: '1rem' }}>Please provide names for your {bookingData.count - 1} guest(s):</p>
                                {Array.from({ length: bookingData.count - 1 }).map((_, i) => (
                                    <div key={i} style={{ marginBottom: '0.5rem' }}>
                                        <input
                                            placeholder={`Guest ${i + 1} Name`}
                                            className="input-field"
                                            onChange={e => {
                                                const newGuests = [...(bookingData.guests || [])];
                                                if (!newGuests[i]) newGuests[i] = {}; // Ensure obj exists
                                                newGuests[i] = { ...newGuests[i], name: e.target.value };
                                                setBookingData({ ...bookingData, guests: newGuests });
                                            }}
                                        />
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button
                                        className="btn"
                                        onClick={() => {
                                            // Validate guests
                                            const guests = bookingData.guests || [];
                                            // Filter out empty
                                            const validGuests = guests.slice(0, bookingData.count - 1).filter(g => g && g.name);
                                            if (validGuests.length < bookingData.count - 1) {
                                                showDialog({ title: 'Incomplete', message: 'Please fill in all guest names.', type: 'alert' });
                                                return;
                                            }
                                            joinEvent(validGuests);
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        Confirm Booking
                                    </button>
                                    <button className="btn-secondary" onClick={() => setBookingStep(1)} style={{ flex: 1 }}>Back</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAttendeesModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }} onClick={() => setShowAttendeesModal(false)}>
                    <div style={{
                        background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)',
                        width: '400px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto',
                        border: '1px solid var(--border-color)', position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Attendees</h2>
                            <button onClick={() => setShowAttendeesModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>

                        {attendees.length === 0 ? (
                            <p>No one else is here yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {attendees.map(user => (
                                    <div key={user.uid} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', flexShrink: 0
                                        }}>
                                            {user.displayName?.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{user.displayName}</div>
                                        </div>
                                        {isHost && user.uid !== currentUser.uid && (
                                            <button
                                                onClick={() => handleKickUser(user.uid)}
                                                className="btn-secondary"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
