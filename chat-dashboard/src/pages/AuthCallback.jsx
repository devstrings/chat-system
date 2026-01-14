import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const username = searchParams.get("username");
    const profileImage = searchParams.get("profileImage");

    if (token && username) {
      // Save to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      
      if (profileImage && profileImage !== "null" && profileImage !== "") {
        localStorage.setItem("profileImage", profileImage);
      }

      console.log("OAuth Login Success:", { token, username, profileImage });

      // Redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 500);
    } else {
      console.error(" OAuth Login Failed - Missing token/username");
      navigate("/login", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto mb-4"></div>
        <p className="text-lg">Logging you in...</p>
      </div>
    </div>
  );
}