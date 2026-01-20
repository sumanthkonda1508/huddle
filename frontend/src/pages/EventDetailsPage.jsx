import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function EventDetailsPage() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [showAttendeesModal, setShowAttendeesModal] = useState(false);
    const [attendees, setAttendees] = useState([]);
    const navigate = useNavigate();

    // ... refreshEntry ...

    useEffect(() => {
        if (showAttendeesModal) {
            api.getParticipants(id)
                .then(res => setAttendees(res.data))
                .catch(err => console.error(err));
        }
    }, [showAttendeesModal, id]);

    const handleKickUser = async (userId) => {
        if (!window.confirm('Remove this user from the event?')) return;
        try {
            await api.removeParticipant(id, userId);
            setAttendees(attendees.filter(u => u.uid !== userId));
            // Update main event count
            refreshEntry();
        } catch (err) {
            console.error(err);
            alert('Failed to remove user');
        }
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
            alert('Failed to post comment');
        }
    };

    const joinEvent = async () => {
        try {
            await api.joinEvent(id);
            refreshEntry();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to join');
        }
    };

    const leaveEvent = async () => {
        try {
            await api.leaveEvent(id);
            refreshEntry();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to leave');
        }
    }

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to cancel this event?')) return;
        try {
            await api.deleteEvent(id);
            navigate('/');
        } catch (err) {
            alert('Failed to delete event');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!event) return <div>Event not found</div>;

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            await api.deleteComment(id, commentId);
            refreshEntry();
        } catch (error) {
            console.error(error);
            alert('Failed to delete comment');
        }
    };

    const isParticipant = event.participants?.includes(currentUser?.uid);
    const isFull = event.participants?.length >= event.maxParticipants;
    const isHost = currentUser && event.hostId === currentUser.uid;

    // Urgency Text
    const seatsTaken = event.participants?.length || 0;
    let urgencyText = "Selling Fast";
    if (isFull) urgencyText = "Sold Out";
    else if (seatsTaken >= event.maxParticipants * 0.8) urgencyText = "Hurry! Almost Full";

    const displayedAttendees = attendees.slice(0, 4);

    return (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '0', overflow: 'hidden' }}>
            {/* Back Button Overlay or Top */}
            <div style={{ padding: '1rem' }}>
                <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                    ← Back
                </button>
            </div>

            <div style={{
                height: '200px',
                background: 'linear-gradient(to right, #4c1d95, #8b5cf6)',
                display: 'flex',
                alignItems: 'end',
                padding: '2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0' }}>{event.title}</h1>
            </div>
            <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                    <span>📍 {event.city}</span>
                    <span>🏷️ {event.hobby}</span>
                    <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                </div>

                {/* Attendees Preview */}
                <div
                    onClick={() => setShowAttendeesModal(true)}
                    style={{
                        margin: '1.5rem 0',
                        padding: '1rem',
                        background: 'rgba(139, 92, 246, 0.05)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Show limited avatars */}
                        <div style={{ display: 'flex' }}>
                            {displayedAttendees.map((u, i) => (
                                <div key={u.uid} style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#ddd',
                                    border: '2px solid white',
                                    marginLeft: i > 0 ? '-10px' : 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    overflow: 'hidden'
                                }}>
                                    {u.photoURL ? <img src={u.photoURL} alt={u.displayName} style={{ width: '100%', height: '100%' }} /> : (u.displayName?.[0] || '?')}
                                </div>
                            ))}
                            {attendees.length > 4 && (
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#e2e8f0',
                                    border: '2px solid white',
                                    marginLeft: '-10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#64748b'
                                }}>+{attendees.length - 4}</div>
                            )}
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--primary)' }}>See who's going</span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <span style={{
                            color: isFull ? 'var(--danger)' : 'var(--text-secondary)',
                            fontWeight: 'bold'
                        }}>
                            {urgencyText}
                        </span>
                    </div>
                </div>

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
                                                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0
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

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>About</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{event.description || 'No description provided.'}</p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Venue</h3>
                    <p>{event.venue}</p>
                </div>

                {currentUser ? (
                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                        {isHost ? (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>You are the host</span>
                                <Link to={`/events/${id}/edit`} className="btn-secondary">Edit Event</Link>
                                <button onClick={handleDelete} className="btn-secondary" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>Cancel Event</button>
                            </div>
                        ) : isParticipant ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ color: '#4ade80', fontWeight: 'bold' }}>✓ You are going!</div>
                                {event.allowCancellation !== false ? (
                                    <button onClick={leaveEvent} className="btn-secondary" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>Leave Event</button>
                                ) : (
                                    <div style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        Ticket Non-Refundable
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={joinEvent}
                                className="btn"
                                disabled={isFull}
                                style={{ opacity: isFull ? 0.5 : 1 }}
                            >
                                {isFull ? 'Event Full' : 'Join Event'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius)' }}>
                        <Link to="/login" style={{ color: 'var(--primary)' }}>Login</Link> to join this event.
                    </div>
                )}

                {/* Discussion Section */}
                <div style={{ marginTop: '3rem' }}>
                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Discussion</h3>

                    {/* Comment List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                        {comments.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>No comments yet. Be the first to start the conversation!</p>
                        ) : (
                            comments.map(comment => {
                                const canDelete = currentUser && (currentUser.uid === comment.userId || isHost);
                                return (
                                    <div key={comment.id} style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0
                                        }}>
                                            {comment.displayName?.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 'bold' }}>{comment.displayName}</span>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : 'Just now'}
                                                    </span>
                                                </div>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}
                                                        title="Delete Comment"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                            <p style={{ lineHeight: '1.5', color: 'var(--text-primary)' }}>{comment.text}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Post Comment Form */}
                    {currentUser && (
                        <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0
                            }}>
                                {currentUser.displayName?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    rows="3"
                                    className="input-field"
                                    style={{ marginBottom: '0.5rem', resize: 'vertical' }}
                                />
                                <button
                                    type="submit"
                                    className="btn-secondary"
                                    disabled={!newComment.trim()}
                                    style={{ opacity: !newComment.trim() ? 0.5 : 1 }}
                                >
                                    Post Comment
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
