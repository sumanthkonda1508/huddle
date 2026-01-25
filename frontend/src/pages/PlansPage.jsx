import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Check } from 'lucide-react';

export default function PlansPage() {
    const navigate = useNavigate();
    const { currentUser, refreshProfile } = useAuth();
    const [activeTab, setActiveTab] = React.useState('organizer');
    const [loading, setLoading] = React.useState(false);

    const handleSelectPlan = async (plan, type) => {
        if (!currentUser) {
            navigate('/login');
            return;
        }

        if (window.confirm(`Confirm upgrade to ${plan.replace('_', ' ').toUpperCase()} plan?`)) {
            setLoading(true);
            try {
                await api.subscribe({ plan, type });
                await refreshProfile(); // Refresh profile to update plan status immediately
                alert(`Successfully subscribed to ${plan} plan!`);

                // Navigate based on plan type
                if (type === 'venue') {
                    navigate('/venues/new'); // Go back to listing
                } else {
                    navigate('/dashboard');
                }
            } catch (err) {
                console.error(err);
                alert("Failed to update plan. Please try again.");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            {/* Header */}
            <div className="dashboard-header">
                <div className="container">
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '1rem', color: 'var(--text-secondary)',
                            marginBottom: '1rem', padding: 0,
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                        <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem' }}>Choose Your Plan</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
                            Unlock the full potential of Huddle. Select the plan that fits your needs.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', gap: '1rem' }}>
                        <button
                            className={`tab-btn ${activeTab === 'organizer' ? 'active' : ''}`}
                            onClick={() => setActiveTab('organizer')}
                            style={{ fontSize: '1.2rem', padding: '0.75rem 2rem' }}
                        >
                            Event Organizer
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'venue' ? 'active' : ''}`}
                            onClick={() => setActiveTab('venue')}
                            style={{ fontSize: '1.2rem', padding: '0.75rem 2rem' }}
                        >
                            Venue Owner
                        </button>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingBottom: '4rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>

                    {/* Organizer Plans */}
                    {activeTab === 'organizer' && (
                        <>
                            {/* Basic Host */}
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
                                        <span style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'flex' }}><Check size={16} /></span> Standard support
                                    </li>
                                </ul>
                                <button
                                    onClick={() => handleSelectPlan('basic', 'host')}
                                    className="btn-secondary"
                                    style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                                >
                                    Select Basic
                                </button>
                            </div>

                            {/* Pro Host */}
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
                                    ₹299<span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/mo</span>
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
                                        <strong>Verified Host Badge</strong>
                                    </li>
                                </ul>
                                <button
                                    onClick={() => handleSelectPlan('pro', 'host')}
                                    className="btn"
                                    style={{ marginTop: 'auto', width: '100%', justifyContent: 'center', padding: '1rem' }}
                                >
                                    Get Pro Access
                                </button>
                            </div>
                        </>
                    )}

                    {/* Venue Plans */}
                    {activeTab === 'venue' && (
                        <>
                            {/* Basic Venue */}
                            <div className="card" style={{
                                display: 'flex', flexDirection: 'column', gap: '1.5rem',
                                padding: '2.5rem', border: '1px solid var(--border-color)',
                                position: 'relative', overflow: 'hidden'
                            }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Basic Venue</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>For new venue owners.</p>
                                </div>
                                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Free</div>
                                <div style={{ width: '100%', height: '1px', background: 'var(--border-color)' }}></div>
                                <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'flex' }}><Check size={16} /></span> List 1 Venue
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'flex' }}><Check size={16} /></span> Standard support
                                    </li>
                                </ul>
                                <button
                                    onClick={() => handleSelectPlan('basic', 'venue')}
                                    className="btn-secondary"
                                    style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                                >
                                    Select Basic
                                </button>
                            </div>

                            {/* Venue Pro */}
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
                                    RECOMMENDED
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Venue Pro</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>For venue owners.</p>
                                </div>
                                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                    ₹999<span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/mo</span>
                                </div>
                                <div style={{ width: '100%', height: '1px', background: 'var(--border-color)' }}></div>
                                <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ background: '#ecfdf5', color: '#059669', padding: '2px', borderRadius: '50%', display: 'flex' }}><Check size={12} /></div>
                                        <strong>Unlimited</strong> Venue Listings
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ background: '#ecfdf5', color: '#059669', padding: '2px', borderRadius: '50%', display: 'flex' }}><Check size={12} /></div>
                                        Featured Venue Badge
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ background: '#ecfdf5', color: '#059669', padding: '2px', borderRadius: '50%', display: 'flex' }}><Check size={12} /></div>
                                        Priority Support
                                    </li>
                                </ul>
                                <button
                                    onClick={() => handleSelectPlan('venue_pro', 'venue')}
                                    className="btn"
                                    style={{ marginTop: 'auto', width: '100%', justifyContent: 'center', padding: '1rem' }}
                                >
                                    Get Venue Pro
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)' }}>
                    <p>Secure payments processed by Stripe. Cancel anytime.</p>
                </div>
            </div>
        </div>
    );
}
