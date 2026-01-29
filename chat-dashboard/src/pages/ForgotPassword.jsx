// client/src/pages/ForgotPassword.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiMail, FiArrowLeft, FiCopy } from "react-icons/fi";
import API_BASE_URL from "../config/api";
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
        email,
      });

      //  Get reset URL from response (development only)
      if (res.data.resetUrl) {
        setResetUrl(res.data.resetUrl);
      }

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  //  Copy URL function
  const copyToClipboard = () => {
    navigator.clipboard.writeText(resetUrl);
    alert("Reset link copied to clipboard!");
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white px-4">
        <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiMail className="text-green-500 text-3xl" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Reset Link Generated!</h2>
          <p className="text-gray-400 mb-6">
            For <strong className="text-white">{email}</strong>
          </p>

          {/* Show reset link in development */}
          {resetUrl && (
            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-200 mb-2">
                Development Mode: Reset Link
              </p>
              <div className="bg-gray-900 p-3 rounded text-xs break-all mb-3">
                {resetUrl}
              </div>
              <button
                onClick={copyToClipboard}
                className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded flex items-center justify-center gap-2 transition-colors"
              >
                <FiCopy /> Copy Link
              </button>
            </div>
          )}

          <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 px-4 py-3 rounded-lg mb-6 text-sm">
            The link will expire in 15 minutes
          </div>

          <button
            onClick={() => navigate("/login")}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-lg font-semibold transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <FiArrowLeft /> Back to Login
        </button>

        <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Forgot Password?
        </h1>
        <p className="text-center text-gray-400 mb-6 text-sm">
          Enter your email to get a reset link
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                Generating...
              </span>
            ) : (
              "Generate Reset Link"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
