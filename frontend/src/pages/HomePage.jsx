import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function HomePage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        q: '',
        city: '',
        hobby: ''
    });
    // Debounced filters to avoid API hammering
    const [debouncedFilters, setDebouncedFilters] = useState(filters);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilters(filters);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters]);

    useEffect(() => {
        setLoading(true);
        // Clean filters to remove empty strings
        const activeFilters = {};
        if (debouncedFilters.q) activeFilters.q = debouncedFilters.q;
        if (debouncedFilters.city) activeFilters.city = debouncedFilters.city;
        if (debouncedFilters.hobby) activeFilters.hobby = debouncedFilters.hobby;

        api.getEvents(activeFilters)
            .then(res => setEvents(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [debouncedFilters]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const clearFilters = () => {
        setFilters({ q: '', city: '', hobby: '' });
    };

    return (
        <div>
            <SEO
                title="Home"
                description="Discover local events and hobbies in your city. Join Huddle today!"
            />
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">Discover Your Next Adventure</h1>
                    <p className="hero-subtitle">Join thousands of others in finding hobbies, events, and communities near you.</p>

                    {/* Modern Search Bar */}
                    <div className="search-container">
                        <div className="search-input-group">
                            <input
                                type="text"
                                name="q"
                                value={filters.q}
                                onChange={handleFilterChange}
                                placeholder="Search events..."
                                className="search-input"
                            />
                        </div>
                        <div className="search-divider"></div>
                        <div className="search-input-group">
                            <input
                                type="text"
                                name="city"
                                value={filters.city}
                                onChange={handleFilterChange}
                                placeholder="City"
                                className="search-input"
                            />
                        </div>
                        <div className="search-divider"></div>
                        <div className="search-input-group">
                            <input
                                type="text"
                                name="hobby"
                                value={filters.hobby}
                                onChange={handleFilterChange}
                                placeholder="Category"
                                className="search-input"
                            />
                        </div>
                        <button className="search-btn" onClick={() => { /* Trigger search if needed, currently auto-updates */ }}>
                            Search
                        </button>
                    </div>
                    {(filters.q || filters.city || filters.hobby) && (
                        <div style={{ marginTop: '1rem' }}>
                            <button
                                onClick={clearFilters}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-primary)', padding: '0.25rem 0.75rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                                Clear Filters ✕
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Upcoming Events</h2>
                    {/* Optional: Add sort or view options here */}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Loading events...</div>
                ) : events.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>
                        <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>No events found matching your criteria.</p>
                        <button onClick={clearFilters} className="btn">View All Events</button>
                    </div>
                ) : (
                    <div className="event-grid">
                        {events.map(event => (
                            <Link key={event.id} to={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                                <div className="event-card">
                                    <div className="event-card-image">
                                        {/* Use a placeholder image or event-specific image if available */}
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
                                            {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <h3 className="event-title-card">{event.title}</h3>
                                        <div className="event-location">
                                            <span>📍</span> {event.city}
                                        </div>

                                        <div className="event-card-footer">
                                            <div className="price-tag">
                                                {event.price > 0 ? `$${event.price}` : 'Free'}
                                            </div>
                                            <span className="btn-card">Details →</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
