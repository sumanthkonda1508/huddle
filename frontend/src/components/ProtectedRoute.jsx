import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ verifiedType }) {
    const { currentUser, userProfile, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (verifiedType === 'host' && !userProfile?.isVerified) {
        return <Navigate to="/verification" replace />;
    }

    if (verifiedType === 'venue' && !userProfile?.isVenueVerified) {
        return <Navigate to="/venue-verification" replace />;
    }

    return <Outlet />;
}
