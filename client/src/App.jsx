import React, { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import Tasks from "./pages/Tasks";
import NotesPage from "./pages/NotesPage";
import CalendarPage from "./pages/CalendarPage";
import RemindersPage from "./pages/RemindersPage";
import Assistant from "./pages/Assistant";
import SearchPage from "./pages/SearchPage";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Documents from "./pages/Documents";
import Planner from "./pages/Planner";

function Gate({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="main muted">Loading Kairo…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, toast } = useAuth();
  useEffect(() => {
    document.documentElement.dataset.theme = user?.theme || "light";
  }, [user]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <Gate>
              <Layout />
            </Gate>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="documents" element={<Documents />} />
          <Route path="planner" element={<Planner />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}