import axios from 'axios';
import { auth } from '../firebase';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

client.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default client;

export const api = {
    // User
    getProfile: () => client.get('/users/me'),
    updateProfile: (data) => client.put('/users/me', data),
    getHostedEvents: () => client.get('/users/me/events/hosted'),
    getJoinedEvents: () => client.get('/users/me/events/joined'),

    // Events
    getEvents: (filters) => client.get('/events', { params: filters }),
    getEvent: (id) => client.get(`/events/${id}`),
    createEvent: (data) => client.post('/events', data),
    updateEvent: (id, data) => client.put(`/events/${id}`, data),
    deleteEvent: (id) => client.delete(`/events/${id}`),
    joinEvent: (id, data) => client.post(`/events/${id}/join`, data),
    leaveEvent: (id) => client.post(`/events/${id}/leave`),
    syncUser: (data) => client.post('/users/sync', data),
    subscribe: (data) => client.post('/users/me/subscribe', data),
    requestVerification: (url) => client.post('/users/me/verify_request', { documentUrl: url }),
    approveHost: (uid) => client.post(`/users/${uid}/approve`),
    getPendingUsers: () => client.get('/users/pending'),

    // Comments
    getComments: (eventId) => client.get(`/events/${eventId}/comments`),
    addComment: (eventId, text) => client.post(`/events/${eventId}/comments`, { text }),
    deleteComment: (eventId, commentId) => client.delete(`/events/${eventId}/comments/${commentId}`),

    // Participants
    getParticipants: (eventId) => client.get(`/events/${eventId}/participants`),
    removeParticipant: (eventId, userId) => client.delete(`/events/${eventId}/participants/${userId}`),

    // Notifications
    getNotifications: () => client.get('/notifications'),
    markNotificationRead: (id) => client.put(`/notifications/${id}/read`),
    markAllNotificationsRead: () => client.put('/notifications/read-all'),

    // Venues
    createVenue: (data) => client.post('/venues', data),
    updateVenue: (id, data) => client.put(`/venues/${id}`, data),
    deleteVenue: (id) => client.delete(`/venues/${id}`),
    getVenues: () => client.get('/venues'),
    getMyVenues: () => client.get('/venues/my'),
    getVenueDetails: (id) => client.get(`/venues/${id}`),
    requestVenueBooking: (id, data) => client.post(`/venues/${id}/book`, data),

    // Wishlist
    getWishlist: () => client.get('/users/me/wishlist'),
    addToWishlist: (item) => client.post('/users/me/wishlist', item),
    removeFromWishlist: (itemId) => client.delete(`/users/me/wishlist/${itemId}`),
};
