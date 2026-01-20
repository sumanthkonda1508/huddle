import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';

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
            <h1 className="page-title">Discover Events</h1>

            {/* Search and Filter Section */}
            <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '2 1 300px' }}>
                    <input
                        type="text"
                        name="q"
                        value={filters.q}
                        onChange={handleFilterChange}
                        placeholder="Search events..."
                        className="input-field"
                        style={{ margin: 0 }}
                    />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <input
                        type="text"
                        name="city"
                        value={filters.city}
                        onChange={handleFilterChange}
                        placeholder="Filter by City"
                        className="input-field"
                        style={{ margin: 0 }}
                    />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <input
                        type="text"
                        name="hobby"
                        value={filters.hobby}
                        onChange={handleFilterChange}
                        placeholder="Filter by Category"
                        className="input-field"
                        style={{ margin: 0 }}
                    />
                </div>
                {(filters.q || filters.city || filters.hobby) && (
                    <button onClick={clearFilters} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                        Clear Filters
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '3rem' }}>Loading events...</div>
            ) : events.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>
                    No events found matching your criteria.
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '2rem'
                }}>
                    {events.map(event => (
                        <div key={event.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{
                                height: '140px',
                                background: 'linear-gradient(45deg, var(--card-bg), var(--border-color))',
                                borderRadius: 'var(--radius) var(--radius) 0 0',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)'
                            }}>
                                <span>{event.hobby}</span>
                            </div>

                            <div style={{ padding: '0.5rem', flex: 1 }}>
                                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{event.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    📅 {new Date(event.date).toLocaleDateString()}
                                </p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                    📍 {event.city} • {event.venue}
                                </p>
                                <Link to={`/events/${event.id}`} className="btn" style={{ width: '100%', textAlign: 'center' }}>
                                    View Event
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
