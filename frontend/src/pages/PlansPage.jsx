import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Check } from 'lucide-react';

export default function PlansPage() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const handleSelectPlan = async (plan) => {
        // Proceed to identity verification
        navigate('/verification');
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            {/* Header */}
            <div className="dashboard-header">
                <div className="container">
                    <button
                        onClick={() => navigate(-1)}
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
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                        <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem' }}>Choose Your Hosting Plan</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
                            Unlock the full potential of Huddle. Whether you're organizing a small meetup or a large festival, we have the right tools for you.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingBottom: '4rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                    {/* Basic Plan */}
                    <div className="card" style={{
                        display: 'flex', flexDirection: 'column', gap: '1.5rem',
                        padding: '2.5rem', border: '1px solid var(--border-color)',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Basic Host</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Perfect for getting started.</p>
                        </div>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Free</div>
                        <div style={{ width: '100%', height: '1px', background: 'var(--border-color)' }}></div>
                        <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'flex' }}><Check size={16} /></span> Host 1 active event
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'flex' }}><Check size={16} /></span> Basic event analytics
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'flex' }}><Check size={16} /></span> Standard email support
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                                <span style={{ color: '#ccc' }}>−</span> No verified badge
                            </li>
                        </ul>
                        <button
                            onClick={() => handleSelectPlan('basic')}
                            className="btn-secondary"
                            style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                        >
                            Select Basic
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div className="card" style={{
                        display: 'flex', flexDirection: 'column', gap: '1.5rem',
                        padding: '2.5rem',
                        border: '2px solid var(--primary)',
                        position: 'relative', overflow: 'hidden',
                        transform: 'scale(1.02)',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div style={{
                            position: 'absolute', top: 0, right: 0,
                            background: 'var(--primary)', color: 'white',
                            padding: '0.25rem 1rem', fontSize: '0.8rem',
                            fontWeight: 'bold', borderRadius: '0 0 0 8px'
                        }}>
                            POPULAR
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Pro Host</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>For serious event organizers.</p>
                        </div>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            $9.99<span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/mo</span>
                        </div>
                        <div style={{ width: '100%', height: '1px', background: 'var(--border-color)' }}></div>
                        <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: '#ecfdf5', color: '#059669', padding: '2px', borderRadius: '50%', display: 'flex' }}><Check size={12} /></div>
                                <strong>Unlimited</strong> active events
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: '#ecfdf5', color: '#059669', padding: '2px', borderRadius: '50%', display: 'flex' }}><Check size={12} /></div>
                                Advanced Analytics & Insights
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: '#ecfdf5', color: '#059669', padding: '2px', borderRadius: '50%', display: 'flex' }}><Check size={12} /></div>
                                Priority 24/7 Support
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: '#ecfdf5', color: '#059669', padding: '2px', borderRadius: '50%', display: 'flex' }}><Check size={12} /></div>
                                <strong>Verified Host Badge</strong>
                            </li>
                        </ul>
                        <button
                            onClick={() => handleSelectPlan('pro')}
                            className="btn"
                            style={{ marginTop: 'auto', width: '100%', justifyContent: 'center', padding: '1rem' }}
                        >
                            Get Pro Access
                        </button>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)' }}>
                    <p>Secure payments processed by Stripe. Cancel anytime.</p>
                </div>
            </div>
        </div>
    );
}
