import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';

import ResourceListPage from './pages/resources/ResourceListPage';
import ResourceDetailPage from './pages/resources/ResourceDetailPage';
import ResourceFormPage from './pages/resources/ResourceFormPage';
import ResourceWatchlistPage from './pages/resources/ResourceWatchlistPage';

import BookingListPage from './pages/bookings/BookingListPage';
import BookingCreatePage from './pages/bookings/BookingCreatePage';
import BookingAdminPage from './pages/bookings/BookingAdminPage';
import BookingDetailPage from './pages/bookings/BookingDetailPage';
import BookingCalendarPage from './pages/bookings/BookingCalendarPage';
import BookingScannerPage from './pages/bookings/BookingScannerPage';

import TicketListPage from './pages/tickets/TicketListPage';
import TicketCreatePage from './pages/tickets/TicketCreatePage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';

import NotificationPage from './pages/notifications/NotificationPage';
import ProfilePage from './pages/profile/ProfilePage';
import AnalyticsDashboardPage from './pages/analytics/AnalyticsDashboardPage';
import ResourceAssistantPage from './pages/assistant/ResourceAssistantPage';

import UserManagementPage from './pages/admin/UserManagementPage';
import ActivityFeedPage from './pages/admin/ActivityFeedPage';
import TechnicianWorkspacePage from './pages/technician/TechnicianWorkspacePage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Resources */}
              <Route path="/resources" element={<ResourceListPage />} />
              <Route path="/resources/watchlist" element={<ProtectedRoute roles={['USER']}><ResourceWatchlistPage /></ProtectedRoute>} />
              <Route path="/resources/new" element={<ProtectedRoute roles={['ADMIN']}><ResourceFormPage /></ProtectedRoute>} />
              <Route path="/resources/:id" element={<ResourceDetailPage />} />
              <Route path="/resources/:id/edit" element={<ProtectedRoute roles={['ADMIN']}><ResourceFormPage /></ProtectedRoute>} />

              {/* Bookings */}
              <Route path="/bookings" element={<ProtectedRoute roles={['USER', 'ADMIN']}><BookingListPage /></ProtectedRoute>} />
              <Route path="/bookings/create" element={<ProtectedRoute roles={['USER']}><BookingCreatePage /></ProtectedRoute>} />
              <Route path="/bookings/:id" element={<ProtectedRoute roles={['USER', 'ADMIN']}><BookingDetailPage /></ProtectedRoute>} />
              <Route path="/bookings/admin" element={<ProtectedRoute roles={['ADMIN']}><BookingAdminPage /></ProtectedRoute>} />
              <Route path="/bookings/calendar" element={<ProtectedRoute roles={['USER', 'ADMIN', 'TECHNICIAN']}><BookingCalendarPage /></ProtectedRoute>} />
              <Route path="/bookings/scanner" element={<ProtectedRoute roles={['ADMIN']}><BookingScannerPage /></ProtectedRoute>} />

              {/* Tickets */}
              <Route path="/tickets" element={<TicketListPage />} />
              <Route path="/tickets/create" element={<ProtectedRoute roles={['USER', 'ADMIN']}><TicketCreatePage /></ProtectedRoute>} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />

              {/* Notifications */}
              <Route path="/notifications" element={<NotificationPage />} />

              {/* AI Assistant */}
              <Route path="/assistant/resource" element={<ProtectedRoute roles={['USER', 'ADMIN', 'TECHNICIAN']}><ResourceAssistantPage /></ProtectedRoute>} />

              {/* Profile */}
              <Route path="/profile" element={<ProfilePage />} />

              {/* Admin Pages */}
              <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><UserManagementPage /></ProtectedRoute>} />
              <Route path="/admin/activity" element={<ProtectedRoute roles={['ADMIN']}><ActivityFeedPage /></ProtectedRoute>} />

              {/* Technician Pages */}
              <Route path="/technician/workspace" element={<ProtectedRoute roles={['TECHNICIAN', 'ADMIN']}><TechnicianWorkspacePage /></ProtectedRoute>} />

              {/* Analytics */}
              <Route path="/analytics" element={<ProtectedRoute roles={['ADMIN']}><AnalyticsDashboardPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>

          <Toaster position="top-center" toastOptions={{
            className: 'dark:bg-gray-800 dark:text-white',
            duration: 3000,
          }} />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
