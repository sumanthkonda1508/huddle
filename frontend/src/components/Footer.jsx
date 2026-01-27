import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="container">
                <div className="footer-content">
                    {/* Brand & Description */}
                    <div className="footer-section">
                        <Link to="/" className="brand" style={{ fontSize: '1.8rem', marginBottom: '1rem', display: 'inline-block' }}>
                            Huddle
                        </Link>
                        <p className="footer-text">
                            Discover the best events in your city or find the perfect venue for your next gathering.
                            Huddle connects people with experiences and spaces.
                        </p>
                        <div className="social-links">
                            <a href="#" className="social-link" aria-label="Facebook"><Facebook size={20} /></a>
                            <a href="#" className="social-link" aria-label="Twitter"><Twitter size={20} /></a>
                            <a href="#" className="social-link" aria-label="Instagram"><Instagram size={20} /></a>
                            <a href="#" className="social-link" aria-label="LinkedIn"><Linkedin size={20} /></a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="footer-section">
                        <h3 className="footer-heading">Discover</h3>
                        <ul className="footer-links">
                            <li><Link to="/">Upcoming Events</Link></li>
                            <li><Link to="/venues">Find Venues</Link></li>
                            <li><Link to="/events/new">Host an Event</Link></li>
                            <li><Link to="/venues/new">List a Venue</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className="footer-section">
                        <h3 className="footer-heading">Support</h3>
                        <ul className="footer-links">
                            <li><a href="#">Help Center</a></li>
                            <li><a href="#">Terms of Service</a></li>
                            <li><a href="#">Privacy Policy</a></li>
                            <li><Link to="/contact">Contact Us</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="footer-section">
                        <h3 className="footer-heading">Contact Us</h3>
                        <ul className="footer-contact">
                            <li><Mail size={16} /> support@huddle.com</li>
                            <li><Phone size={16} /> +91 98765 43210</li>
                            <li><MapPin size={16} /> Hyderabad, India</li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} Huddle. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
