import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export default function EventCard({ event }) {
    return (
        <Link to={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
            <div className="event-card">
                <div className="event-card-image">
                    <img
                        src={event.mediaUrls && event.mediaUrls.length > 0 ? event.mediaUrls[0] : `https://source.unsplash.com/random/800x600/?${event.hobby},event`}
                        alt={event.title}
                        className="event-card-img-placeholder"
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.background = 'linear-gradient(45deg, #334155, #475569)'; }}
                    />
                    <div className="category-badge">{event.hobby}</div>
                </div>
                <div className="event-card-content">
                    <div className="event-date">
                        {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <h3 className="event-title-card">{event.title}</h3>
                    <div className="event-location">
                        <MapPin size={14} /> {event.city}
                    </div>
                    <div className="event-card-footer">
                        <div className="price-tag">{event.price > 0 ? `₹${event.price}` : 'Free'}</div>
                        <span className="btn-card">Details &rarr;</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
