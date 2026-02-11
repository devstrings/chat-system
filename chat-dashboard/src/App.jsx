import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchCurrentUser } from "./store/slices/authSlice";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

//  GLOBAL FLAG 
let userFetchInitiated = false;

// PROTECTED ROUTE 
function ProtectedRoute({ children }) {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, currentUser } = useSelector((state) => state.auth);
  
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  useEffect(() => {
    if ((accessToken || refreshToken) && !currentUser && !userFetchInitiated) {
      console.log("Fetching current user (one time only)...");
      userFetchInitiated = true;
      dispatch(fetchCurrentUser());
    }
  }, [dispatch]); // Only dispatch in dependency

  if (!accessToken && !refreshToken) {
    console.log(" No tokens found, redirecting to login");
    userFetchInitiated = false; // Reset flag
    return <Navigate to="/login" replace />;
  }

  //  Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700">Loading...</div>
          <div className="text-sm text-gray-500 mt-2">Please wait</div>
        </div>
      </div>
    );
  }

  if (!loading && !currentUser && userFetchInitiated) {
    console.log(" User fetch failed, clearing tokens");
    localStorage.clear();
    userFetchInitiated = false; // Reset flag
    return <Navigate to="/login" replace />;
  }

  //  Success - render children
  return children;
}

// ROOT REDIRECT
function RootRedirect() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  if (isAuthenticated || accessToken || refreshToken) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
}

// Main App
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* Protected Routes */}
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