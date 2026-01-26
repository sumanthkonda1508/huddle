import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, ArrowRight } from 'lucide-react';

export default function VenueCard({ venue }) {
    return (
        <Link to={`/venues/${venue.id}`} style={{ textDecoration: 'none' }}>
            <div className="event-card">
                <div className="event-card-image">
                    <img
                        src={venue.images?.[0] || 'https://via.placeholder.com/400x200?text=Venue'}
                        alt={venue.name}
                        className="event-card-img-placeholder"
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.background = 'linear-gradient(45deg, #334155, #475569)'; }}
                    />
                    <div className="category-badge">Venue</div>
                </div>

                <div className="event-card-content">
                    <div className="event-date" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={14} /> Capacity: {venue.capacity}
                    </div>

                    <h3 className="event-title-card">{venue.name}</h3>

                    <div className="event-location" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={14} /> {venue.location}
                    </div>

                    <div className="event-card-footer">
                        <div className="price-tag">
                            {venue.price_per_hour ? `₹${venue.price_per_hour}/hr` : 'Contact for Price'}
                        </div>
                        <span className="btn-card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Details <ArrowRight size={14} /></span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
