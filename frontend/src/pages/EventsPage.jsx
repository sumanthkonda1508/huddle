import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import EventCard from '../components/EventCard';
import { Search, MapPin, Calendar, Layers, IndianRupee, X } from 'lucide-react';
import { CITIES } from '../base/venue_constants';
import { useLocation } from 'react-router-dom';

const CATEGORIES = [
    "Music", "Health", "Business", "Social", "Arts"
];

export default function EventsPage() {
    const locationHook = useLocation();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [lastDocId, setLastDocId] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // Live Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Draft Filter States
    const [draftCity, setDraftCity] = useState('');
    const [draftCategory, setDraftCategory] = useState('');
    const [draftDate, setDraftDate] = useState('upcoming');
    const [draftMaxPrice, setDraftMaxPrice] = useState('');
    const [draftSortBy, setDraftSortBy] = useState('date');

    // Active Filter States
    const [activeFilters, setActiveFilters] = useState({
        city: '',
        hobby: '',
        date_filter: 'upcoming',
        max_price: '',
        q: '',
        sort_by: 'date'
    });

    useEffect(() => {
        // Initialize from query params if present (basic implementation)
        const params = new URLSearchParams(locationHook.search);
        const q = params.get('q');
        const city = params.get('city');
        const category = params.get('category');

        let initialFilters = { ...activeFilters };

        if (q) {
            setSearchTerm(q);
            initialFilters.q = q;
        }
        if (city) {
            setDraftCity(city);
            initialFilters.city = city;
        }
        if (category) {
            setDraftCategory(category);
            initialFilters.hobby = category;
        }

        setActiveFilters(initialFilters);
        fetchEvents(false, initialFilters);
    }, [locationHook.search]);

    const fetchEvents = async (isLoadMore = false, filtersToUse = activeFilters) => {
        if (!isLoadMore) setLoading(true);
        else setLoadingMore(true);
        try {
            const currentLastId = isLoadMore ? lastDocId : null;
            const res = await api.getEvents(filtersToUse, currentLastId);
            if (isLoadMore) {
                setEvents(prev => [...prev, ...res.data.data]);
            } else {
                setEvents(res.data.data);
            }
            setHasMore(res.data.hasMore);
            setLastDocId(res.data.lastDocId);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const applyFilters = () => {
        const newFilters = {
            city: draftCity,
            hobby: draftCategory,
            date_filter: draftDate,
            max_price: draftMaxPrice,
            q: searchTerm,
            sort_by: draftSortBy
        };
        setActiveFilters(newFilters);
        fetchEvents(false, newFilters);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDraftCity('');
        setDraftCategory('');
        setDraftDate('upcoming');
        setDraftMaxPrice('');
        setDraftSortBy('date');
        const clearedFilters = {
            city: '',
            hobby: '',
            date_filter: 'upcoming',
            max_price: '',
            q: '',
            sort_by: 'date'
        };
        setActiveFilters(clearedFilters);
        fetchEvents(false, clearedFilters);
    };

    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading events...</div>;

    return (
        <div className="container fade-in">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 className="page-title">Discover Events</h1>
                    <p className="page-subtitle">Find the best local events for your next adventure.</p>
                </div>

                {/* Combined Search and Filter Bar */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    alignItems: 'center',
                    background: 'white',
                    padding: '0.75rem',
                    borderRadius: '50px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    maxWidth: '100%'
                }}>

                    {/* Search Input (Live) */}
                    <div style={{ flex: '2 1 200px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input"
                            style={{ paddingLeft: '2.5rem', border: 'none', background: 'transparent', borderRadius: '0' }}
                        />
                    </div>

                    {/* City Select */}
                    <div style={{ flex: '1 1 140px', position: 'relative' }}>
                        <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
                        <select
                            className="form-input"
                            value={draftCity}
                            onChange={(e) => setDraftCity(e.target.value)}
                            style={{ paddingLeft: '2.25rem', border: '1px solid var(--border-color)', borderRadius: '25px', backgroundColor: '#F8FAFC', fontSize: '0.9rem' }}
                        >
                            <option value="">City</option>
                            {CITIES.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category Select */}
                    <div style={{ flex: '1 1 130px', position: 'relative' }}>
                        <Layers size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
                        <select
                            className="form-input"
                            value={draftCategory}
                            onChange={(e) => setDraftCategory(e.target.value)}
                            style={{ paddingLeft: '2.25rem', border: '1px solid var(--border-color)', borderRadius: '25px', backgroundColor: '#F8FAFC', fontSize: '0.9rem' }}
                        >
                            <option value="">Category</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Select */}
                    <div style={{ flex: '1 1 130px', position: 'relative' }}>
                        <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
                        <select
                            className="form-input"
                            value={draftDate}
                            onChange={(e) => setDraftDate(e.target.value)}
                            style={{ paddingLeft: '2.25rem', border: '1px solid var(--border-color)', borderRadius: '25px', backgroundColor: '#F8FAFC', fontSize: '0.9rem' }}
                        >
                            <option value="">Any Date</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="today">Today</option>
                            <option value="past">Past</option>
                        </select>
                    </div>

                    {/* Sort Select */}
                    <div style={{ flex: '1 1 130px', position: 'relative' }}>
                        <select
                            className="form-input"
                            value={draftSortBy}
                            onChange={(e) => setDraftSortBy(e.target.value)}
                            style={{ paddingLeft: '1rem', border: '1px solid var(--border-color)', borderRadius: '25px', backgroundColor: '#F8FAFC', fontSize: '0.9rem' }}
                        >
                            <option value="date">Sort: Date</option>
                            <option value="popularity">Sort: Popularity</option>
                            <option value="price">Sort: Price</option>
                        </select>
                    </div>

                    {/* Max Price Input */}
                    <div style={{ flex: '1 1 100px', position: 'relative' }}>
                        <IndianRupee size={16} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
                        <input
                            type="number"
                            className="form-input"
                            placeholder="Max ₹"
                            value={draftMaxPrice}
                            onChange={(e) => setDraftMaxPrice(e.target.value)}
                            style={{ paddingLeft: '1.75rem', border: '1px solid var(--border-color)', borderRadius: '25px', backgroundColor: '#F8FAFC', fontSize: '0.9rem' }}
                        />
                    </div>

                    {/* Apply Button */}
                    <button
                        className="btn"
                        onClick={applyFilters}
                        style={{ borderRadius: '25px', padding: '0.5rem 1.5rem', height: '42px', minWidth: '80px' }}
                    >
                        Apply
                    </button>

                    {/* Clear Button */}
                    {(searchTerm || activeFilters.city || activeFilters.hobby || (activeFilters.date_filter && activeFilters.date_filter !== 'upcoming') || activeFilters.max_price || activeFilters.sort_by !== 'date') && (
                        <button
                            onClick={clearFilters}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Clear Filters"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <h3>No events found</h3>
                    <p>Try adjusting your search terms or filters.</p>
                    <button className="btn" onClick={clearFilters} style={{ marginTop: '1rem' }}>Clear All</button>
                </div>
            ) : (
                <>
                    <div className="event-grid">
                        {events.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => fetchEvents(true)}
                                disabled={loadingMore}
                                style={{ padding: '0.75rem 2rem', borderRadius: '50px' }}
                            >
                                {loadingMore ? 'Loading...' : 'Load More Events'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
