import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import API_BASE_URL from "../config/api";

export default function Login() {
  const navigate = useNavigate();
  const hasNavigated = useRef(false);
  const hasCheckedAuth = useRef(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    
    if (accessToken || refreshToken) {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        navigate("/dashboard", { replace: true });
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  
  console.log(" Form submitted!");
  console.log(" Email:", formData.email);
  
  setLoading(true);
  setError("");

  try {
    console.log(" Making API call to:", `${API_BASE_URL}/api/auth/login`);
    
    const res = await axiosInstance.post("/api/auth/login", formData);

    console.log(" Full Response:", res);
    console.log(" Response Data:", res.data);
    console.log(" Access Token:", res.data.accessToken);
    console.log(" Refresh Token:", res.data.refreshToken);

    if (res.data.accessToken && res.data.refreshToken) {
      console.log(" About to save tokens...");
      
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken);
      localStorage.setItem("username", res.data.username);

      if (res.data.profileImage) {
        localStorage.setItem("profileImage", res.data.profileImage);
      }

      //  VERIFY tokens were saved
      console.log(" Verification - Access Token saved:", localStorage.getItem("accessToken"));
      console.log(" Verification - Refresh Token saved:", localStorage.getItem("refreshToken"));
      
      console.log(" Navigating to dashboard...");
      
      hasNavigated.current = true;
      navigate("/dashboard", { replace: true });
    } else {
      console.error(" No tokens in response!");
      console.error(" Response structure:", JSON.stringify(res.data, null, 2));
      setError("Login failed - no tokens received");
    }
  } catch (err) {
    console.error(" Login error:", err);
    console.error(" Error message:", err.message);
    console.error(" Error response:", err.response);
    console.error(" Error data:", err.response?.data);
    console.error(" Error status:", err.response?.status);
    
    setError(err.response?.data?.message || "Login failed. Please try again.");
  } finally {
    setLoading(false);
    console.log(" Login process finished");
  }
};

  const handleGoogleLogin = () => {
    console.log(" Google login clicked");
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const handleFacebookLogin = () => {
    console.log(" Facebook login clicked");
    window.location.href = `${API_BASE_URL}/api/auth/facebook`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Chat-System
        </h1>
        <p className="text-center text-gray-400 mb-6 text-sm">
          Welcome back! Please login to continue
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-100 transition-all shadow-md hover:shadow-lg"
          >
            <FcGoogle className="text-2xl" />
            Continue with Google
          </button>

          <button
            type="button"
            onClick={handleFacebookLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white py-3 rounded-lg font-medium hover:bg-[#1565C0] transition-all shadow-md hover:shadow-lg"
          >
            <FaFacebook className="text-2xl" />
            Continue with Facebook
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-700"></div>
          <span className="text-gray-500 text-sm">OR</span>
          <div className="flex-1 h-px bg-gray-700"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />

            <div className="text-right mt-2">
              <span
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-blue-400 cursor-pointer hover:underline transition-colors"
              >
                Forgot Password?
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                Logging in...
              </span>
            ) : (
              "Login with Email"
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-400 text-sm">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-blue-400 cursor-pointer hover:underline font-medium"
          >
            Create Account
          </span>
        </p>
      </div>
    </div>
  );
}