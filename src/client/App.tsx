import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AccountPage } from "./pages/AccountPage";
import { CreateTripPage } from "./pages/CreateTripPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EditTripPage } from "./pages/EditTripPage";
import { TripItineraryPage } from "./pages/TripItineraryPage";
import { LoadingState } from "./components/LoadingState";

function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50">{children}</main>
    </>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingState />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <DashboardPage />
              </PublicRoute>
            }
          />
          <Route path="/trips" element={<Navigate to="/" replace />} />
          <Route
            path="/trips/new"
            element={
              <PublicRoute>
                <CreateTripPage />
              </PublicRoute>
            }
          />
          <Route
            path="/trips/:tripId/edit"
            element={
              <PublicRoute>
                <EditTripPage />
              </PublicRoute>
            }
          />
          <Route
            path="/trips/:tripId"
            element={
              <PublicRoute>
                <TripItineraryPage />
              </PublicRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
