import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Ticket, Calendar, MapPin, Loader2, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useDialog } from '../context/DialogContext';

export default function MyTicketsPage() {
    const { currentUser } = useAuth();
    const { showDialog } = useDialog();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [qrUrl, setQrUrl] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrError, setQrError] = useState(false);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const res = await api.getMyTickets();
                setTickets(res.data);
            } catch (err) {
                console.error('Failed to fetch tickets:', err);
                showDialog({ title: 'Error', message: 'Could not load your tickets.', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchTickets();
        } else {
            setLoading(false);
        }
    }, [currentUser, showDialog]);

    // Fetch QR code via authenticated client when a ticket is selected
    useEffect(() => {
        if (!selectedTicket) {
            // Cleanup previous blob URL
            if (qrUrl) URL.revokeObjectURL(qrUrl);
            setQrUrl(null);
            setQrError(false);
            return;
        }

        let cancelled = false;
        const fetchQr = async () => {
            setQrLoading(true);
            setQrError(false);
            setQrUrl(null);
            try {
                const res = await client.get(`/tickets/${selectedTicket.id}/qr`, {
                    responseType: 'blob'
                });
                if (!cancelled) {
                    const blobUrl = URL.createObjectURL(res.data);
                    setQrUrl(blobUrl);
                }
            } catch (err) {
                console.error('Failed to load QR:', err);
                if (!cancelled) setQrError(true);
            } finally {
                if (!cancelled) setQrLoading(false);
            }
        };

        fetchQr();

        return () => {
            cancelled = true;
        };
    }, [selectedTicket]);

    if (!currentUser) {
        return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Please log in to view your tickets.</div>;
    }

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <SEO title="My Tickets - Huddle" />
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <Ticket size={32} color="var(--primary)" /> My Tickets & Bookings
            </h1>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '4rem 0' }}>
                    <Loader2 size={40} className="spinning" color="var(--primary)" />
                </div>
            ) : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', background: 'var(--card-bg)', padding: '4rem 2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                    <div style={{ background: 'var(--bg-color)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                        <Ticket size={40} color="var(--text-secondary)" />
                    </div>
                    <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>No tickets found</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>You haven't booked any tickets for upcoming events yet.</p>
                    <Link to="/" className="btn btn-lg">Explore Events</Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {tickets.map(ticket => (
                        <div key={ticket.id} className="ticket-card" style={{
                            background: 'var(--card-bg)',
                            borderRadius: 'calc(var(--radius) * 1.5)',
                            border: '1px solid var(--border-color)',
                            overflow: 'hidden',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* Ticket Header Graphic */}
                            <div style={{
                                height: '120px',
                                background: ticket.mediaUrls?.[0] ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${ticket.mediaUrls[0]})` : 'linear-gradient(135deg, var(--primary), var(--accent))',
                                backgroundSize: 'cover', backgroundPosition: 'center',
                                padding: '1.5rem',
                                color: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{
                                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                                        padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px'
                                    }}>
                                        {ticket.status === 'active' ? 'Valid Entry' : ticket.status}
                                    </span>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {ticket.eventTitle || 'Event'}
                                </h3>
                            </div>

                            {/* Ticket Body */}
                            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: '1.2rem', display: 'flex', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    <Calendar size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }} />
                                    <span>
                                        {ticket.eventDate ? new Date(ticket.eventDate).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date TBA'}
                                    </span>
                                </div>
                                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    <MapPin size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--danger)' }} />
                                    <span>{ticket.eventVenue || 'Venue TBA'}</span>
                                </div>

                                <div style={{ marginTop: 'auto', borderTop: '1px border-color dashed', paddingTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="btn"
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <Ticket size={18} /> View QR Ticket
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* View Ticket QR Modal */}
            {selectedTicket && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '1rem'
                }} onClick={() => setSelectedTicket(null)}>
                    <div style={{
                        background: 'var(--card-bg)', borderRadius: 'calc(var(--radius) * 2)',
                        width: '400px', maxWidth: '100%',
                        overflow: 'hidden', position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }} onClick={e => e.stopPropagation()}>

                        <div style={{ background: 'var(--primary)', height: '10px' }}></div>

                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{selectedTicket.eventTitle}</h2>
                            <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)' }}>
                                {selectedTicket.eventDate ? new Date(selectedTicket.eventDate).toLocaleDateString() : ''}
                            </p>

                            <div style={{
                                background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block',
                                border: '2px solid #eee', marginBottom: '2rem', minHeight: '220px', minWidth: '220px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {qrLoading ? (
                                    <Loader2 size={40} className="spinning" color="var(--primary)" />
                                ) : qrError ? (
                                    <div style={{ color: 'var(--danger)', padding: '2rem 1rem' }}>
                                        Failed to load QR code.
                                    </div>
                                ) : qrUrl ? (
                                    <img
                                        src={qrUrl}
                                        alt="Ticket QR Code"
                                        style={{ width: '220px', height: '220px', display: 'block' }}
                                    />
                                ) : null}
                            </div>

                            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                                TICKET ID: {selectedTicket.id.split('-')[0].substring(0, 8)}
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedTicket(null)}
                            style={{
                                position: 'absolute', top: '1.5rem', right: '1.5rem',
                                background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%',
                                width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--text-primary)'
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

