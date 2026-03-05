import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import VenueCard from '../components/VenueCard';
import { Search, MapPin, Users, IndianRupee, X } from 'lucide-react'; // Added icons for inputs
import { CITIES } from '../base/venue_constants';

export default function VenuesPage() {
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [lastDocId, setLastDocId] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // Live Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Draft Filter States (for inputs)
    const [draftCity, setDraftCity] = useState('');
    const [draftCapacity, setDraftCapacity] = useState('');
    const [draftMinPrice, setDraftMinPrice] = useState('');
    const [draftMaxPrice, setDraftMaxPrice] = useState('');
    const [draftSortBy, setDraftSortBy] = useState('created_at');

    // Active Filter States (applied to grid)
    const [activeFilters, setActiveFilters] = useState({
        city: '',
        min_capacity: '',
        min_price: '',
        max_price: '',
        q: '',
        sort_by: 'created_at'
    });

    useEffect(() => {
        fetchVenues(false, activeFilters);
    }, []);

    const fetchVenues = async (isLoadMore = false, filtersToUse = activeFilters) => {
        if (!isLoadMore) setLoading(true);
        else setLoadingMore(true);
        try {
            const currentLastId = isLoadMore ? lastDocId : null;
            const res = await api.getVenues(filtersToUse, currentLastId);
            if (isLoadMore) {
                setVenues(prev => [...prev, ...res.data.data]);
            } else {
                setVenues(res.data.data);
            }
            setHasMore(res.data.hasMore);
            setLastDocId(res.data.lastDocId);
        } catch (error) {
            console.error("Failed to fetch venues:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const applyFilters = () => {
        const newFilters = {
            city: draftCity,
            min_capacity: draftCapacity,
            min_price: draftMinPrice,
            max_price: draftMaxPrice,
            q: searchTerm,
            sort_by: draftSortBy
        };
        setActiveFilters(newFilters);
        fetchVenues(false, newFilters);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDraftCity('');
        setDraftCapacity('');
        setDraftMinPrice('');
        setDraftMaxPrice('');
        setDraftSortBy('created_at');

        const clearedFilters = {
            city: '',
            min_capacity: '',
            min_price: '',
            max_price: '',
            q: '',
            sort_by: 'created_at'
        };
        setActiveFilters(clearedFilters);
        fetchVenues(false, clearedFilters);
    };

    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading venues...</div>;

    return (
        <div className="container fade-in">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 className="page-title">Find a Venue</h1>
                    <p className="page-subtitle">Discover the perfect space for your next event.</p>
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
                            placeholder="Search venues..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input"
                            style={{ paddingLeft: '2.5rem', border: 'none', background: 'transparent', borderRadius: '0' }}
                        />
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', display: 'none' /* hidden on mobile wrap */ }} className="desktop-divider"></div>

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

                    {/* Capacity Input */}
                    <div style={{ flex: '1 1 100px', position: 'relative' }}>
                        <Users size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
                        <input
                            type="number"
                            className="form-input"
                            placeholder="Cap."
                            value={draftCapacity}
                            onChange={(e) => setDraftCapacity(e.target.value)}
                            style={{ paddingLeft: '2.25rem', border: '1px solid var(--border-color)', borderRadius: '25px', backgroundColor: '#F8FAFC', fontSize: '0.9rem' }}
                        />
                    </div>

                    {/* Price Inputs (Min) */}
                    <div style={{ flex: '1 1 100px', position: 'relative' }}>
                        <IndianRupee size={16} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
                        <input
                            type="number"
                            className="form-input"
                            placeholder="Min ₹"
                            value={draftMinPrice}
                            onChange={(e) => setDraftMinPrice(e.target.value)}
                            style={{ paddingLeft: '1.75rem', border: '1px solid var(--border-color)', borderRadius: '25px', backgroundColor: '#F8FAFC', fontSize: '0.9rem' }}
                        />
                    </div>
                    {/* Price Inputs (Max) */}
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

                    {/* Sort Select */}
                    <div style={{ flex: '1 1 130px', position: 'relative' }}>
                        <select
                            className="form-input"
                            value={draftSortBy}
                            onChange={(e) => setDraftSortBy(e.target.value)}
                            style={{ paddingLeft: '1rem', border: '1px solid var(--border-color)', borderRadius: '25px', backgroundColor: '#F8FAFC', fontSize: '0.9rem' }}
                        >
                            <option value="created_at">Sort: Newest</option>
                            <option value="price">Sort: Price</option>
                            <option value="capacity">Sort: Capacity</option>
                        </select>
                    </div>

                    {/* Apply Button */}
                    <button
                        className="btn"
                        onClick={applyFilters}
                        style={{ borderRadius: '25px', padding: '0.5rem 1.5rem', height: '42px', minWidth: '80px' }}
                    >
                        Apply
                    </button>

                    {/* Clear Button (only if active filters or search) */}
                    {(searchTerm || activeFilters.city || activeFilters.min_capacity || activeFilters.min_price || activeFilters.max_price || activeFilters.sort_by !== 'created_at') && (
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

            {venues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <h3>No venues found</h3>
                    <p>Try adjusting your search terms or filters.</p>
                    <button className="btn" onClick={clearFilters} style={{ marginTop: '1rem' }}>Clear All</button>
                </div>
            ) : (
                <>
                    <div className="event-grid">
                        {venues.map(venue => (
                            <VenueCard key={venue.id} venue={venue} />
                        ))}
                    </div>
                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => fetchVenues(true)}
                                disabled={loadingMore}
                                style={{ padding: '0.75rem 2rem', borderRadius: '50px' }}
                            >
                                {loadingMore ? 'Loading...' : 'Load More Venues'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
