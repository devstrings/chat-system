import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

// Middleware
import Middleware from '@/Middleware';

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyOTP from "@/pages/VerifyOTP";
import Conversation from "@/pages/Conversation";
import NotFound from "@/pages/NotFound"; 


function RootRedirect() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  if (isAuthenticated || accessToken || refreshToken) {
    return <Navigate to="/conversation/home" replace />; 
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <Middleware>
              <Dashboard />
            </Middleware>
          }
        />
        <Route
          path="/conversation/home"  
          element={
            <Middleware>
              <Conversation />
            </Middleware>
          }
        />
        <Route
          path="/conversation/:conversationId"
          element={
            <Middleware>
              <Conversation />
            </Middleware>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}