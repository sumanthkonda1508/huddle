import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useDialog } from '../context/DialogContext';
import { ArrowLeft, Check, ExternalLink } from 'lucide-react';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('host'); // 'host' or 'venue'
    const [subTab, setSubTab] = useState('pending'); // 'pending', 'approved', 'rejected'

    const [pendingUsers, setPendingUsers] = useState([]);
    const [approvedUsers, setApprovedUsers] = useState([]);
    const [rejectedUsers, setRejectedUsers] = useState([]);

    const [pendingVenues, setPendingVenues] = useState([]);
    const [approvedVenues, setApprovedVenues] = useState([]);
    const [rejectedVenues, setRejectedVenues] = useState([]);

    const navigate = useNavigate();
    const { showDialog } = useDialog();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [
                pendingRes, approvedRes, rejectedRes,
                pendingVenuesRes, approvedVenuesRes, rejectedVenuesRes
            ] = await Promise.all([
                api.getPendingUsers(), api.getApprovedUsers(), api.getRejectedUsers(),
                api.getPendingVenues(), api.getApprovedVenues(), api.getRejectedVenues()
            ]);
            setPendingUsers(pendingRes.data);
            setApprovedUsers(approvedRes.data);
            setRejectedUsers(rejectedRes.data);

            setPendingVenues(pendingVenuesRes.data);
            setApprovedVenues(approvedVenuesRes.data);
            setRejectedVenues(rejectedVenuesRes.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const handleApprove = async (uid, type) => {
        try {
            await api.approveHost(uid, type);
            showDialog({
                title: 'Success',
                message: `${type === 'venue' ? 'Venue' : 'Host'} request approved!`,
                type: 'success'
            });
            fetchData(); // Refresh all lists
        } catch (err) {
            console.error(err);
            showDialog({ title: 'Error', message: 'Failed to approve', type: 'error' });
        }
    }

    const handleReject = async (uid, type) => {
        try {
            await api.rejectHost(uid, type);
            showDialog({ title: 'Rejected', message: 'Request rejected/revoked.', type: 'info' });
            fetchData(); // Refresh all lists
        } catch (err) {
            console.error(err);
            showDialog({ title: 'Error', message: 'Failed to reject', type: 'error' });
        }
    }

    const getActiveList = () => {
        if (activeTab === 'host') {
            if (subTab === 'pending') return pendingUsers;
            if (subTab === 'approved') return approvedUsers;
            if (subTab === 'rejected') return rejectedUsers;
        } else {
            if (subTab === 'pending') return pendingVenues;
            if (subTab === 'approved') return approvedVenues;
            if (subTab === 'rejected') return rejectedVenues;
        }
        return [];
    };

    const renderTable = (users) => {
        if (users.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)' }}>
                    <p>No {subTab} {activeTab} requests found.</p>
                </div>
            );
        }
        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                        <tr>
                            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>User</th>
                            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Email</th>
                            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Status</th>
                            {subTab === 'pending' && <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Document</th>}
                            <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.uid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: '500' }}>{user.displayName || 'Unnamed'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>UID: {user.uid.substring(0, 8)}...</div>
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: '500',
                                        background: subTab === 'approved' ? '#DCFCE7' : subTab === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                                        color: subTab === 'approved' ? '#166534' : subTab === 'rejected' ? '#991B1B' : '#92400E'
                                    }}>
                                        {subTab.charAt(0).toUpperCase() + subTab.slice(1)}
                                    </span>
                                </td>
                                {subTab === 'pending' && (
                                    <td style={{ padding: '1rem' }}>
                                        <a
                                            href={(activeTab === 'host' ? user.verificationDocument : user.venueVerificationDocument)}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                        >
                                            View Doc <ExternalLink size={14} />
                                        </a>
                                    </td>
                                )}
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    {subTab === 'pending' && (
                                        <>
                                            <button onClick={() => handleReject(user.uid, activeTab)} className="btn" style={{ padding: '0.4rem 0.8rem', background: '#EF4444', marginRight: '0.5rem', fontSize: '0.9rem' }}>Reject</button>
                                            <button onClick={() => handleApprove(user.uid, activeTab)} className="btn" style={{ padding: '0.4rem 0.8rem', background: '#10B981', fontSize: '0.9rem' }}>Approve</button>
                                        </>
                                    )}
                                    {subTab === 'approved' && (
                                        <button onClick={() => handleReject(user.uid, activeTab)} className="btn" style={{ padding: '0.4rem 0.8rem', background: '#EF4444', fontSize: '0.9rem' }}>Revoke / Reject</button>
                                    )}
                                    {subTab === 'rejected' && (
                                        <button onClick={() => handleApprove(user.uid, activeTab)} className="btn" style={{ padding: '0.4rem 0.8rem', background: '#10B981', fontSize: '0.9rem' }}>Re-Approve</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            <div className="dashboard-header">
                <div className="container">
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem',
                            color: 'var(--text-secondary)', marginBottom: '1rem', padding: 0,
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <ArrowLeft size={20} /> Back to Home
                    </button>
                    <div>
                        <h1 style={{ marginBottom: '0.5rem' }}>Admin Dashboard</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Manage user verifications and community safety.</p>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Main Tabs */}
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <button
                        onClick={() => setActiveTab('host')}
                        className={activeTab === 'host' ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '0.5rem 1.5rem' }}
                    >
                        Host Verification
                    </button>
                    <button
                        onClick={() => setActiveTab('venue')}
                        className={activeTab === 'venue' ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '0.5rem 1.5rem' }}
                    >
                        Venue Verification
                    </button>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: '#F8FAFC', display: 'flex', gap: '0.5rem' }}>
                        {['pending', 'approved', 'rejected'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setSubTab(tab)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    border: 'none',
                                    background: subTab === tab ? 'white' : 'transparent',
                                    borderRadius: 'var(--radius)',
                                    boxShadow: subTab === tab ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    color: subTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontWeight: subTab === tab ? '600' : '400',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {renderTable(getActiveList())}
                </div>

                <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Note: This dashboard is visible for demonstration. In production, strict role-based access control applies.
                </p>
            </div>
        </div>
    );
}
