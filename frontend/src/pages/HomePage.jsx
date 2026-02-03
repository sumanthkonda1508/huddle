import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { MapPin, Search, Calendar, Users, ArrowRight, Music, Heart, Briefcase, Coffee, Star } from 'lucide-react';
import VenueCard from '../components/VenueCard'; // Assuming you have or will create this, otherwise I'll need to duplicate card logic for now or genericize it.
// Checking if VenueCard exists... I saw it in VenuesPage.jsx import but check file list? 
// Wait, I saw "import VenueCard from '../components/VenueCard';" in VenuesPage.jsx content earlier.
// So it exists.

const CATEGORIES = [
    { id: 'music', name: 'Music', icon: Music },
    { id: 'health', name: 'Health', icon: Heart },
    { id: 'business', name: 'Business', icon: Briefcase },
    { id: 'social', name: 'Social', icon: Coffee },
    { id: 'arts', name: 'Arts', icon: Star },
];

import { useAuth } from '../context/AuthContext'; // Import useAuth

export default function HomePage() {
    const navigate = useNavigate();
    const { userProfile } = useAuth(); // Access user profile
    const [events, setEvents] = useState([]);
    const [featuredVenues, setFeaturedVenues] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search State
    const [searchMode, setSearchMode] = useState('events'); // 'events' or 'venues'
    const [searchTerm, setSearchTerm] = useState('');
    const [location, setLocation] = useState('');
    const [category, setCategory] = useState('');

    const canViewVenues = userProfile?.isVerified || userProfile?.isVenueVerified; // Check permissions

    useEffect(() => {
        // Force 'events' mode if user cannot view venues
        if (!canViewVenues && searchMode === 'venues') {
            setSearchMode('events');
        }
    }, [canViewVenues, searchMode]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Events
                const eventsRes = await api.getEvents();
                setEvents(eventsRes.data.slice(0, 6));

                // Fetch Venues (only if needed or public? API is public but UI is restricted)
                const venuesRes = await api.getVenues();
                setFeaturedVenues(venuesRes.data.slice(0, 3));
            } catch (err) {
                console.error("Failed to fetch home data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSearch = () => {
        if (searchMode === 'events') {
            navigate(`/?q=${searchTerm}`);
        } else {
            navigate(`/venues?q=${searchTerm}&city=${location}`);
        }
    };

    return (
        <div className="home-page">
            <SEO
                title="Huddle | Discover Events & Venues"
                description="Find the best local events and unique venues for your next gathering."
            />

            {/* Hero Section V2 */}
            <div className="hero-v2">
                <div className="hero-bg">
                    {/* Placeholder for video/image */}
                    <img
                        src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80"
                        alt="Background"
                        className="hero-video"
                    />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.7)' }}></div>
                </div>

                <div className="hero-content-v2 fade-in">
                    <h1 className="hero-title-v2">Discover Your Next <span style={{ color: 'var(--primary)' }}>Adventure</span></h1>
                    <p className="hero-subtitle-v2">
                        Join thousands of others in finding hobbies, events, and communities near you.
                        {canViewVenues
                            ? " Or find the perfect space to host your own."
                            : " Start your journey today."}
                    </p>

                    {/* Unified Search */}
                    <div className="search-wrapper">
                        {canViewVenues && (
                            <div className="search-tabs">
                                <button
                                    className={`search-tab ${searchMode === 'events' ? 'active' : ''}`}
                                    onClick={() => setSearchMode('events')}
                                >
                                    Events
                                </button>
                                <button
                                    className={`search-tab ${searchMode === 'venues' ? 'active' : ''}`}
                                    onClick={() => setSearchMode('venues')}
                                >
                                    Venues
                                </button>
                            </div>
                        )}

                        <div className="glass-search-container">
                            <div className="glass-input-group">
                                <Search className="glass-icon" size={20} />
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder={searchMode === 'events' ? "Search events..." : "Search venues..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="search-divider"></div>
                            <div className="glass-input-group">
                                <MapPin className="glass-icon" size={20} />
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="City"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>
                            <div className="search-divider"></div>
                            {searchMode === 'events' && (
                                <>
                                    <div className="glass-input-group">
                                        <Calendar className="glass-icon" size={20} />
                                        <input
                                            type="date"
                                            className="glass-input"
                                            placeholder="Date"
                                            style={{ color: 'var(--text-primary)' }}
                                        // Using type=date usually requires a valid value or empty string. 
                                        // Placeholder often doesn't show for type=date in some browsers without tweaks, 
                                        // but for now let's use type='text' with onFocus or just simple date input.
                                        // Let's stick to standard type="date" and see.
                                        />
                                    </div>
                                    <div className="search-divider"></div>
                                    <div className="glass-input-group">
                                        <Users className="glass-icon" size={20} /> {/* Using Users icon for 'Category' or maybe 'Grid'? Let's use 'Grid' or 'List' if available, or keep 'Users' as placeholder */}
                                        <select
                                            className="glass-input"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            style={{ appearance: 'none', cursor: 'pointer' }}
                                        >
                                            <option value="">Any Category</option>
                                            {CATEGORIES.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                        {/* Custom chevron is missing, standard select arrow might look ok or can hide it */}
                                    </div>
                                </>
                            )}
                            {searchMode === 'venues' && (
                                <>
                                    <div className="glass-input-group">
                                        <Users className="glass-icon" size={20} />
                                        <input
                                            type="number"
                                            className="glass-input"
                                            placeholder="Capacity"
                                        />
                                    </div>
                                    <div className="search-divider"></div>
                                    <div className="glass-input-group">
                                        <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '600', color: 'var(--text-secondary)' }}>₹</div>
                                        <input
                                            type="number"
                                            className="glass-input"
                                            placeholder="Max Price"
                                        />
                                    </div>
                                </>
                            )}
                            <button className="search-action-btn" onClick={handleSearch}>
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container">


                {/* Dynamic Content Section */}
                {searchMode === 'events' ? (
                    <div style={{ marginBottom: '5rem' }}>
                        <div className="section-header">
                            <div>
                                <span className="section-label">Don't Miss Out</span>
                                <h2 className="section-title-lg">Upcoming Events</h2>
                            </div>
                            <Link to="/events" className="btn-secondary">Explore Events <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} /></Link>
                        </div>

                        {loading ? (
                            <div>Loading...</div>
                        ) : (
                            <div className="event-grid">
                                {events.map(event => (
                                    <Link key={event.id} to={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
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
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ marginBottom: '5rem' }}>
                        <div className="section-header">
                            <div>
                                <span className="section-label">Host Your Own</span>
                                <h2 className="section-title-lg">Featured Venues</h2>
                            </div>
                            <Link to="/venues" className="btn-secondary">Explore Venues <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} /></Link>
                        </div>

                        <div className="event-grid">
                            {featuredVenues.length === 0 && !loading && <p>No venues found.</p>}
                            {featuredVenues.map(venue => (
                                <VenueCard key={venue.id} venue={venue} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Testimonials / Trust - Commented out for later use
                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '24px',
                    padding: '3rem',
                    textAlign: 'center',
                    border: '1px solid var(--border-color)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '5px',
                        background: 'linear-gradient(90deg, var(--primary), var(--accent))'
                    }}></div>

                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Trusted by Thousands</h2>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem' }}>
                        Whether you are looking to join a hiking group, attend a workshop, or host a corporate event, Huddle makes it easy.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>10k+</div>
                            <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Events Hosted</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>500+</div>
                            <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Active Venues</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>50k+</div>
                            <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Happy Users</div>
                        </div>
                    </div>
                </div>
                */}
            </div>
        </div>
    );
}
