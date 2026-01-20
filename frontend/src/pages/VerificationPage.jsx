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
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
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
            <h1 className="page-title">Identity Verification</h1>
            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                To host events, we need to verify your identity. Please upload a government-issued ID.
            </p>

            <div className="card">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius)' }}>
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn"
                        disabled={!file || uploading}
                        style={{ opacity: (!file || uploading) ? 0.7 : 1 }}
                    >
                        {uploading ? 'Uploading...' : 'Submit for Review'}
                    </button>
                </form>
            </div>
        </div>
    );
}
