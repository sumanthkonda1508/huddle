import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CreateEventPage from './pages/CreateEventPage';
import EventDetailsPage from './pages/EventDetailsPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import PlansPage from './pages/PlansPage';
import VerificationPage from './pages/VerificationPage';
import VenueVerificationPage from './pages/VenueVerificationPage';
import AdminPage from './pages/AdminPage';
import VenuesPage from './pages/VenuesPage';
import CreateVenuePage from './pages/CreateVenuePage';
import VenueDetailsPage from './pages/VenueDetailsPage';
import EventsPage from './pages/EventsPage';

// Define the router
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={<HomePage />} />
      <Route path="events" element={<EventsPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="events/new" element={<CreateEventPage />} />
      <Route path="events/:id/edit" element={<CreateEventPage />} />
      <Route path="events/:id" element={<EventDetailsPage />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="plans" element={<PlansPage />} />
      <Route path="verification" element={<VerificationPage />} />
      <Route path="venue-verification" element={<VenueVerificationPage />} />
      <Route path="admin" element={<AdminPage />} />
      <Route path="venues" element={<VenuesPage />} />
      <Route path="venues/new" element={<CreateVenuePage />} />
      <Route path="venues/:id/edit" element={<CreateVenuePage />} />
      <Route path="venues/:id" element={<VenueDetailsPage />} />
    </Route>
  )
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
