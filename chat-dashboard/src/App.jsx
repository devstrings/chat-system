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

//  PROTECTED ROUTE (with SocketProvider)
function ProtectedRoute({ children }) {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");
  
  if (!accessToken && !refreshToken) {
    return <Navigate to="/login" replace />;
  }
  
  //  SocketProvider only for authenticated routes
  return <SocketProvider>{children}</SocketProvider>;
}

//  ROOT REDIRECT COMPONENT
function RootRedirect() {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");
  
  if (accessToken || refreshToken) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

//  Main App Component
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        
        {/* Public Routes - WITHOUT Socket */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* Protected Routes - WITH Socket */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}