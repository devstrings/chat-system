import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { verify2FALogin } from "@/store/slices/authSlice";
import axiosInstance from "@/lib/axiosInstance";

export default function Verify2FA() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [sending, setSending] = useState(false);

  const challengeToken = location.state?.challengeToken;
  const method = location.state?.method || "totp";
  const email = location.state?.email;

  useEffect(() => {
    if (!challengeToken) {
      navigate("/login", { replace: true });
    }
  }, [challengeToken, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLocalError("");
    setResendMessage("");
    if (!challengeToken) {
      setLocalError("Session expired. Please login again.");
      return;
    }
    const result = await dispatch(verify2FALogin({ challengeToken, code }));
    if (verify2FALogin.fulfilled.match(result)) {
      navigate("/conversation/home", { replace: true });
    }
  };

  const handleResend = async () => {
    if (method !== "email" || !challengeToken) return;
    setSending(true);
    setLocalError("");
    setResendMessage("");
    try {
      const { data } = await axiosInstance.post("/api/auth/2fa/login/email/send", {
        challengeToken,
      });
      setResendMessage(data?.message || "Verification code sent");
    } catch (err) {
      setLocalError(
        err.response?.data?.message || "Failed to resend verification code",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Two-Factor Verification
        </h1>
        <p className="text-center text-gray-400 mb-6 text-sm">
          {method === "email"
            ? `Enter the code sent to ${email || "your email"}`
            : "Enter the 6-digit code from your authenticator app"}
        </p>

        {(error || localError) && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
            {localError || error}
          </div>
        )}

        {resendMessage && (
          <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-4 text-sm">
            {resendMessage}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              placeholder="Enter 6 digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={8}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify and Sign In"}
          </button>
        </form>

        {method === "email" && (
          <button
            onClick={handleResend}
            disabled={sending}
            className="w-full mt-4 text-gray-400 hover:text-white text-sm transition-all disabled:opacity-50"
          >
            {sending ? "Sending..." : "Resend Code"}
          </button>
        )}
      </div>
    </div>
  );
}
