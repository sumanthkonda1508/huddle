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
    // Analytics
    getPlatformAnalytics: () => client.get('/analytics/platform'),
    getHostAnalytics: () => client.get('/analytics/host'),

    // User
    getProfile: () => client.get('/users/me'),
    updateProfile: (data) => client.put('/users/me', data),
    getHostedEvents: () => client.get('/users/me/events/hosted'),
    getJoinedEvents: () => client.get('/users/me/events/joined'),

    // Events
    getEvents: (filters, lastDocId) => client.get('/events', { params: { ...filters, last_doc_id: lastDocId } }),
    getEvent: (id) => client.get(`/events/${id}`),
    createEvent: (data) => client.post('/events', data),
    updateEvent: (id, data) => client.put(`/events/${id}`, data),
    deleteEvent: (id) => client.delete(`/events/${id}`),
    joinEvent: (id, data) => client.post(`/events/${id}/join`, data),
    leaveEvent: (id) => client.post(`/events/${id}/leave`),
    syncUser: (data) => client.post('/users/sync', data),
    subscribe: (data) => client.post('/users/me/subscribe', data),
    requestVerification: (url, type = 'host') => client.post('/users/me/verify_request', { documentUrl: url, type }),
    approveHost: (uid, type = 'host') => client.post(`/users/${uid}/approve`, { type }),
    rejectHost: (uid, type = 'host') => client.post(`/users/${uid}/reject`, { type }),
    getPendingUsers: () => client.get('/users/pending'),
    getPendingVenues: () => client.get('/users/pending_venues'),
    getApprovedUsers: () => client.get('/users/approved'),
    getApprovedVenues: () => client.get('/users/approved_venues'),
    getRejectedUsers: () => client.get('/users/rejected'),
    getRejectedVenues: () => client.get('/users/rejected_venues'),

    // Comments
    getComments: (eventId, lastDocId) => client.get(`/events/${eventId}/comments`, { params: { last_doc_id: lastDocId } }),
    addComment: (eventId, text) => client.post(`/events/${eventId}/comments`, { text }),
    deleteComment: (eventId, commentId) => client.delete(`/events/${eventId}/comments/${commentId}`),

    // Participants
    getParticipants: (eventId) => client.get(`/events/${eventId}/participants`),
    removeParticipant: (eventId, userId) => client.delete(`/events/${eventId}/participants/${userId}`),

    // Notifications
    getNotifications: (lastDocId) => client.get('/notifications', { params: { last_doc_id: lastDocId } }),
    markNotificationRead: (id) => client.put(`/notifications/${id}/read`),
    markAllNotificationsRead: () => client.put('/notifications/read-all'),

    // Venues
    createVenue: (data) => client.post('/venues', data),
    updateVenue: (id, data) => client.put(`/venues/${id}`, data),
    deleteVenue: (id) => client.delete(`/venues/${id}`),
    getVenueDetails: (id) => client.get(`/venues/${id}`),
    getVenues: (filters, lastDocId) => client.get('/venues', { params: { ...filters, last_doc_id: lastDocId } }),
    getMyVenues: () => client.get('/venues/my'),
    getVenueDetails: (id) => client.get(`/venues/${id}`),
    requestVenueBooking: (id, data) => client.post(`/venues/${id}/book`, data),
    getIncomingBookings: (status) => client.get('/venues/requests/incoming', { params: { status } }),
    getMyBookings: () => client.get('/venues/requests/my'),
    cancelBooking: (id) => client.post(`/venues/requests/${id}/cancel`),
    rejectBooking: (id, reason) => client.post(`/venues/requests/${id}/reject`, { reason }),
    approveBooking: (id) => client.post(`/venues/requests/${id}/approve`),
    getVenueBookings: (venueId) => client.get(`/venues/${venueId}/bookings`),
    createVenuePaymentOrder: (requestId) => client.post(`/venues/requests/${requestId}/create_order`),
    verifyVenuePayment: (requestId, data) => client.post(`/venues/requests/${requestId}/verify_payment`, data),

    addToWishlist: (item) => client.post('/users/me/wishlist', item),
    removeFromWishlist: (itemId) => client.delete(`/users/me/wishlist/${itemId}`),

    // Payments
    createPaymentOrder: (data) => client.post('/payments/create-order', data),
    verifyPayment: (data) => client.post('/payments/verify', data),

    // Tickets
    getMyTickets: () => client.get('/tickets/my'),
    getTicket: (id) => client.get(`/tickets/${id}`),
    checkinTicket: (ticketId) => client.post(`/tickets/${ticketId}/checkin`),

    // Refunds
    refundPayment: (paymentId, data) => client.post(`/payments/${paymentId}/refund`, data),
};
