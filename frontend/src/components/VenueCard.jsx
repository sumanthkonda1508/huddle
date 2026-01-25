import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users } from 'lucide-react';

export default function VenueCard({ venue }) {
    return (
        <Link to={`/venues/${venue.id}`} className="event-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="event-card-image-container">
                <img
                    src={venue.images?.[0] || 'https://via.placeholder.com/400x200?text=Venue'}
                    alt={venue.name}
                    className="event-card-image"
                />
            </div>
            <div className="event-card-content">
                <h3 className="event-card-title">{venue.name}</h3>

                <div className="event-card-details">
                    <div className="event-card-detail-item">
                        <MapPin size={16} />
                        <span>{venue.location}</span>
                    </div>
                    <div className="event-card-detail-item">
                        <Users size={16} />
                        <span>Capacity: {venue.capacity}</span>
                    </div>
                </div>

                <div className="event-card-footer">
                    <div className="event-card-price">
                        {venue.price_per_hour ? `₹${venue.price_per_hour}/hr` : 'Contact for Price'}
                    </div>
                </div>
            </div>
        </Link>
    );
}
