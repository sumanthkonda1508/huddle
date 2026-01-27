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

    // Live Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Draft Filter States
    const [draftCity, setDraftCity] = useState('');
    const [draftCategory, setDraftCategory] = useState('');
    const [draftDate, setDraftDate] = useState('');
    const [draftMaxPrice, setDraftMaxPrice] = useState('');

    // Active Filter States
    const [activeFilters, setActiveFilters] = useState({
        city: '',
        category: '',
        date: '',
        maxPrice: ''
    });

    useEffect(() => {
        // Initialize from query params if present (basic implementation)
        const params = new URLSearchParams(locationHook.search);
        const q = params.get('q');
        const city = params.get('city');
        // const category = params.get('category'); // If passed

        if (q) setSearchTerm(q);
        if (city) {
            setDraftCity(city);
            setActiveFilters(prev => ({ ...prev, city }));
        }

        fetchEvents();
    }, [locationHook.search]);

    const fetchEvents = async () => {
        try {
            // Fetch all events for now and filter client-side as per requirement "similar to venues"
            // If backend supports filtering, we should pass params. 
            // Client.js has getEvents(filters) but let's see if we can do client side first to match VenuesPage logic which does client side.
            // VenuesPage fetches all and filters client side. I'll do the same for consistency unless list is huge.
            const res = await api.getEvents();
            setEvents(res.data);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        setActiveFilters({
            city: draftCity,
            category: draftCategory,
            date: draftDate,
            maxPrice: draftMaxPrice
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDraftCity('');
        setDraftCategory('');
        setDraftDate('');
        setDraftMaxPrice('');
        setActiveFilters({
            city: '',
            category: '',
            date: '',
            maxPrice: ''
        });
    };

    const filteredEvents = events.filter(e => {
        // 1. Search is LIVE
        const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()));

        // 2. Filters are MANUAL
        const matchesCity = activeFilters.city ? e.city === activeFilters.city : true;

        // Category matching (assuming 'hobby' field represents category or strict match)
        const matchesCategory = activeFilters.category ? e.hobby === activeFilters.category : true;

        // Date matching (simple match: same day)
        // e.date might be ISO string. 
        const matchesDate = activeFilters.date ?
            new Date(e.date).toDateString() === new Date(activeFilters.date).toDateString() : true;

        const matchesMaxPrice = activeFilters.maxPrice ? e.price <= parseInt(activeFilters.maxPrice) : true;

        return matchesSearch && matchesCity && matchesCategory && matchesDate && matchesMaxPrice;
    });

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

                    {/* Date Input */}
                    <div style={{ flex: '1 1 130px', position: 'relative' }}>
                        <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
                        <input
                            type="date"
                            className="form-input"
                            value={draftDate}
                            onChange={(e) => setDraftDate(e.target.value)}
                            style={{ paddingLeft: '2.25rem', border: '1px solid var(--border-color)', borderRadius: '25px', backgroundColor: '#F8FAFC', fontSize: '0.9rem' }}
                        />
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
                    {(searchTerm || activeFilters.city || activeFilters.category || activeFilters.date || activeFilters.maxPrice) && (
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

            {filteredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <h3>No events found</h3>
                    <p>Try adjusting your search terms or filters.</p>
                    <button className="btn" onClick={clearFilters} style={{ marginTop: '1rem' }}>Clear All</button>
                </div>
            ) : (
                <div className="event-grid">
                    {filteredEvents.map(event => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            )}
        </div>
    );
}
