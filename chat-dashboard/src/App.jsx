import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

//  Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";     
import ResetPassword from "./pages/ResetPassword";       

//  Context
import { SocketProvider } from "./context/SocketContext";

//  Protected Route Component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn(" No token found — redirecting to login...");
    return <Navigate to="/login" replace />;
  }
  return children;
}

//  Main App Component
export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Password Reset Routes */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}