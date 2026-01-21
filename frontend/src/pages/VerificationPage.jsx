import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function VerificationPage() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        try {
            // SIMULATED UPLOAD: In real app, upload to Firebase Storage -> get URL.
            // Here we just fake a URL.
            const fakeUrl = `https://fake-storage.com/${file.name}`;

            // Artificial delay
            await new Promise(r => setTimeout(r, 1500));

            await api.requestVerification(fakeUrl);

            alert('Verification submitted! An admin will review your request.');
            navigate('/plans'); // Or dashboard
        } catch (err) {
            console.error(err);
            alert('Failed to submit verification.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
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
                        <span>←</span> Back
                    </button>
                    <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                        <h1 style={{ marginBottom: '1rem' }}>Identity Verification</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                            To ensure the safety of our community, all hosts must verify their identity.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '600px', paddingBottom: '4rem' }}>
                <div className="card">
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        <div>
                            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '500' }}>Upload Government ID</label>
                            <div
                                style={{
                                    padding: '3rem',
                                    border: '2px dashed var(--border-color)',
                                    borderRadius: 'var(--radius)',
                                    textAlign: 'center',
                                    background: file ? '#F0FDFA' : '#F8FAFC',
                                    borderColor: file ? '#0F766E' : 'var(--border-color)',
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                }}
                            >
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    required
                                    style={{
                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                        opacity: 0, cursor: 'pointer'
                                    }}
                                />
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                                    {file ? '📄' : '☁️'}
                                </div>
                                {file ? (
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#0F766E' }}>{file.name}</div>
                                        <div style={{ fontSize: '0.9rem', color: '#0F766E' }}>Ready to submit</div>
                                        <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Click to change file</div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Click or Drag to Upload</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Supported formats: PDF, JPG, PNG</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', background: '#FEF3C7', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', color: '#92400E' }}>
                            <span>🔒</span>
                            <span>
                                Your documents are securely stored and encrypted. They are only used for verification purposes and will never be shared publicly.
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="btn"
                            disabled={!file || uploading}
                            style={{
                                padding: '1rem',
                                fontSize: '1rem',
                                opacity: (!file || uploading) ? 0.7 : 1,
                                cursor: (!file || uploading) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {uploading ? 'Securely Uploading...' : 'Submit Verification Request'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
