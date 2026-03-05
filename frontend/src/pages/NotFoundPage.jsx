import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 80px)', // Account for header offset generally
            backgroundColor: 'var(--bg-color)',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <h1 style={{ fontSize: '4rem', margin: '0', color: 'var(--primary)' }}>404</h1>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Page Not Found</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Oops! The page you are looking for doesn't exist or has been moved.
                </p>
                <Link to="/" className="btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
                    Return to Home
                </Link>
            </div>
        </div>
    );
}
