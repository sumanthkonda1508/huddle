import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function AdminPage() {
    const [pendingUsers, setPendingUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.getPendingUsers()
            .then(res => setPendingUsers(res.data))
            .catch(err => console.error(err));
    }, []);

    const handleApprove = async (uid) => {
        try {
            await api.approveHost(uid);
            alert('User approved!');
            setPendingUsers(prev => prev.filter(u => u.uid !== uid));
        } catch (err) {
            console.error(err);
            alert('Failed to approve');
        }
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
            <h1 className="page-title">Admin Dashboard</h1>
            <div className="card">
                <h2>Pending Host Verifications</h2>
                {pendingUsers.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No pending requests.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        {pendingUsers.map(user => (
                            <div key={user.uid} style={{
                                padding: '1rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{user.displayName}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <a href={user.verificationDocument} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                                            View ID Document
                                        </a>
                                    </div>
                                </div>
                                <button onClick={() => handleApprove(user.uid)} className="btn">
                                    Approve
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Note: In a real app, this page would be restricted to admin accounts only.
            </p>
        </div>
    );
}
