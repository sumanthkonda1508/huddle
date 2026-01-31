import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { compressImage } from '../utils/imageUtils';
import { useDialog } from '../context/DialogContext';
import { ArrowLeft, FileText, CloudUpload, Lock } from 'lucide-react';

export default function VerificationPage() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();
    const { showDialog } = useDialog();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await api.getProfile();
                if (res.data.verificationStatus === 'rejected') {
                    showDialog({
                        title: 'Verification Rejected',
                        message: 'Your previous verification request was rejected. Please ensure your documents are clear and valid, then try again.',
                        type: 'info'
                    });
                }
            } catch (err) {
                console.error(err);
            }
        };
        checkStatus();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        try {
            // Compress and convert to Base64
            // Higher quality for documents might be needed, but still keep under 1MB
            const base64 = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.6 });

            await api.requestVerification(base64);

            showDialog({
                title: 'Verification Submitted',
                message: 'Verification submitted! An admin will review your request.',
                type: 'success',
                onConfirm: () => navigate('/plans')
            });
        } catch (err) {
            console.error(err);
            showDialog({
                title: 'Error',
                message: 'Failed to submit verification.',
                type: 'error'
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            <div className="dashboard-header">
                <div className="container">
                    <button
                        onClick={() => navigate('/dashboard')}
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
                        <ArrowLeft size={20} /> Back to Dashboard
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
                                <div style={{ fontSize: '3rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                                    {file ? <FileText size={48} /> : <CloudUpload size={48} />}
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
                            <span><Lock size={16} /></span>
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
