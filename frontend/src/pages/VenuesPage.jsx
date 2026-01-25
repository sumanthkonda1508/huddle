import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import VenueCard from '../components/VenueCard';
import { Search } from 'lucide-react';

export default function VenuesPage() {
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchVenues();
    }, []);

    const fetchVenues = async () => {
        try {
            const res = await api.getVenues();
            setVenues(res.data);
        } catch (error) {
            console.error("Failed to fetch venues:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredVenues = venues.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading venues...</div>;

    return (
        <div className="container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Find a Venue</h1>
                    <p className="page-subtitle">Discover the perfect space for your next event.</p>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', minWidth: '300px' }}>
                    <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search venues..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
            </div>

            {filteredVenues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <h3>No venues found</h3>
                    <p>Try adjusting your search terms.</p>
                </div>
            ) : (
                <div className="events-grid">
                    {filteredVenues.map(venue => (
                        <VenueCard key={venue.id} venue={venue} />
                    ))}
                </div>
            )}
        </div>
    );
}
