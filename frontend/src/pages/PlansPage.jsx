import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function PlansPage() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const handleSelectPlan = async (plan) => {
        // Proceed to identity verification
        navigate('/verification');
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        color: 'var(--text-secondary)',
                        padding: 0
                    }}
                >
                    ← Back
                </button>
            </div>
            <h1 className="page-title">Become a Host</h1>
            <p style={{ marginBottom: '3rem', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                Verify your account to start hosting events. Choose a plan that suits you.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Basic Plan */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--text-secondary)' }}>
                    <h2>Basic Host</h2>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Free</div>
                    <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: '1rem 0' }}>
                        <li style={{ marginBottom: '0.5rem' }}>✓ Host up to 1 event at a time</li>
                        <li style={{ marginBottom: '0.5rem' }}>✓ Standard support</li>
                    </ul>
                    <button onClick={() => handleSelectPlan('basic')} className="btn-secondary" style={{ marginTop: 'auto' }}>
                        Select Basic
                    </button>
                </div>

                {/* Pro Plan */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--primary)', transform: 'scale(1.02)' }}>
                    <h2>Pro Host</h2>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>$9.99<span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/mo</span></div>
                    <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: '1rem 0' }}>
                        <li style={{ marginBottom: '0.5rem' }}>✓ Unlimited events</li>
                        <li style={{ marginBottom: '0.5rem' }}>✓ Analytics & Insights</li>
                        <li style={{ marginBottom: '0.5rem' }}>✓ Priority Support</li>
                        <li style={{ marginBottom: '0.5rem' }}>✓ Verified Badge</li>
                    </ul>
                    <button onClick={() => handleSelectPlan('pro')} className="btn" style={{ marginTop: 'auto' }}>
                        Select Pro
                    </button>
                </div>
            </div>
        </div>
    );
}
