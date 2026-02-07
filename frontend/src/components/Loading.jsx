import React from 'react';
import '../index.css'; // Ensure CSS is available

export const Skeleton = ({ className, style }) => {
    return (
        <div className={`skeleton ${className}`} style={style}></div>
    );
};

export const EventCardSkeleton = () => {
    return (
        <div className="event-card" style={{ pointerEvents: 'none' }}>
            <div className="event-card-image skeleton" style={{ height: '160px', width: '100%', display: 'block' }}>
                {/* Image placeholder */}
            </div>
            <div className="event-card-content">
                <div className="skeleton" style={{ height: '14px', width: '40%', marginBottom: '0.75rem', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ height: '20px', width: '80%', marginBottom: '0.5rem', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '1rem', borderRadius: '4px' }}></div>

                <div className="event-location" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <div className="skeleton" style={{ height: '14px', width: '14px', borderRadius: '50%' }}></div>
                    <div className="skeleton" style={{ height: '14px', width: '50%', borderRadius: '4px' }}></div>
                </div>

                <div className="event-card-footer" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                    <div className="skeleton" style={{ height: '16px', width: '20%', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ height: '16px', width: '25%', borderRadius: '4px' }}></div>
                </div>
            </div>
        </div>
    );
};

export const LoadingGrid = ({ count = 6 }) => {
    return (
        <div className="event-grid">
            {Array.from({ length: count }).map((_, index) => (
                <EventCardSkeleton key={index} />
            ))}
        </div>
    );
};

export default LoadingGrid;
