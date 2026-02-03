import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useDialog } from '../context/DialogContext';
import { ArrowLeft, Check, ExternalLink } from 'lucide-react';

export default function AdminPage() {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [pendingVenues, setPendingVenues] = useState([]);
    const [approvedUsers, setApprovedUsers] = useState([]);
    const navigate = useNavigate();
    const { showDialog } = useDialog();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pendingRes, pendingVenuesRes, approvedRes] = await Promise.all([
                    api.getPendingUsers(),
                    api.getPendingVenues(),
                    api.getApprovedUsers()
                ]);
                setPendingUsers(pendingRes.data);
                setPendingVenues(pendingVenuesRes.data);
                setApprovedUsers(approvedRes.data);
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        fetchData();
    }, []);

    const handleApprove = async (uid, type) => {
        try {
            await api.approveHost(uid, type);
            showDialog({
                title: 'Success',
                message: `${type === 'venue' ? 'Venue' : 'Host'} request approved!`,
                type: 'success'
            });
            if (type === 'venue') {
                setPendingVenues(prev => prev.filter(u => u.uid !== uid));
            } else {
                setPendingUsers(prev => prev.filter(u => u.uid !== uid));
            }
        } catch (err) {
            console.error(err);
            showDialog({ title: 'Error', message: 'Failed to approve', type: 'error' });
        }
    }

    const handleReject = async (uid, type) => {
        try {
            await api.rejectHost(uid, type);
            showDialog({ title: 'Rejected', message: 'Request rejected.', type: 'info' });
            if (type === 'venue') {
                setPendingVenues(prev => prev.filter(u => u.uid !== uid));
            } else {
                setPendingUsers(prev => prev.filter(u => u.uid !== uid));
            }
        } catch (err) {
            console.error(err);
            showDialog({ title: 'Error', message: 'Failed to reject', type: 'error' });
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            <div className="dashboard-header">
                <div className="container">
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '1rem',
                            padding: 0,
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <ArrowLeft size={20} /> Back to Home
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>Admin Dashboard</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>Manage user verifications and community safety.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>{pendingUsers.length}</span>
                                <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Host Pending</span>
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>{pendingVenues.length}</span>
                                <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Venue Pending</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Host Verification Section */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0 }}>Host Verification Requests</h3>
                    </div>
                    {pendingUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No pending host requests.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>User</th>
                                        <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Document</th>
                                        <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingUsers.map(user => (
                                        <tr key={user.uid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem' }}>{user.displayName} <br /><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</span></td>
                                            <td style={{ padding: '1rem' }}>
                                                <a href={user.verificationDocument} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    View ID <ExternalLink size={14} />
                                                </a>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <button onClick={() => handleReject(user.uid, 'host')} className="btn" style={{ padding: '0.5rem', background: '#EF4444', marginRight: '0.5rem' }}>Reject</button>
                                                <button onClick={() => handleApprove(user.uid, 'host')} className="btn" style={{ padding: '0.5rem', background: '#10B981' }}>Approve</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Venue Verification Section */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0 }}>Venue Verification Requests</h3>
                    </div>
                    {pendingVenues.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No pending venue requests.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>User</th>
                                        <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Document</th>
                                        <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingVenues.map(user => (
                                        <tr key={user.uid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem' }}>{user.displayName} <br /><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</span></td>
                                            <td style={{ padding: '1rem' }}>
                                                <a href={user.venueVerificationDocument} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    View Document <ExternalLink size={14} />
                                                </a>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <button onClick={() => handleReject(user.uid, 'venue')} className="btn" style={{ padding: '0.5rem', background: '#EF4444', marginRight: '0.5rem' }}>Reject Venue</button>
                                                <button onClick={() => handleApprove(user.uid, 'venue')} className="btn" style={{ padding: '0.5rem', background: '#10B981' }}>Approve Venue</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Approved Users Section */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>Verified Hosts</h3>
                        <span style={{ background: '#DCFCE7', color: '#166534', padding: '0.2rem 0.8rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: '500' }}>
                            {approvedUsers.length} Total
                        </span>
                    </div>

                    {approvedUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)' }}>
                            <p>No verified hosts yet.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>User</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Email</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>City</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'right' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {approvedUsers.map(user => (
                                        <tr key={user.uid} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontWeight: '500' }}>{user.displayName || 'Unnamed User'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>UID: {user.uid.substring(0, 8)}...</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                                                {user.email}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                {user.city || '-'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                    padding: '0.25rem 0.75rem', borderRadius: '1rem',
                                                    background: '#DCFCE7', color: '#166534', fontSize: '0.85rem', fontWeight: '500'
                                                }}>
                                                    <Check size={14} /> Verified
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Note: This dashboard is visible for demonstration. In production, strict role-based access control applies.
                </p>
            </div>
        </div>
    );
}
