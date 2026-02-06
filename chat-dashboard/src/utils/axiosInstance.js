import axios from "axios";
import API_BASE_URL from "../config/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Track if we're currently refreshing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

//  STORE INITIAL TOKEN TO DETECT MODIFICATION
let storedAccessToken = localStorage.getItem("accessToken");

//  CHECK TOKEN MODIFICATION BEFORE EACH REQUEST
const checkTokenModification = () => {
  const currentToken = localStorage.getItem("accessToken");
  
  //  SKIP CHECK IF NO TOKEN (for login/register)
  if (!currentToken && !storedAccessToken) {
    return true;
  }
  
  if (currentToken && storedAccessToken && currentToken !== storedAccessToken) {
    console.error(" Token has been manually modified! Logging out...");
    localStorage.clear();
    window.location.href = "/login";
    return false;
  }
  
  return true;
};

// REQUEST INTERCEPTOR
axiosInstance.interceptors.request.use(
  (config) => {
    //  Skip token check for login/register/public routes
    const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh-token'];
    const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));
    
    if (!isPublicRoute) {
      // Only check token modification for protected routes
      if (!checkTokenModification()) {
        return Promise.reject(new Error("Token modified"));
      }
    }
    
    const accessToken = localStorage.getItem("accessToken");
    
    //  Only add Authorization header if token exists AND not a public route
    if (accessToken && !isPublicRoute) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
axiosInstance.interceptors.response.use(
  (response) => {
    //  Update stored token when new token is received (like after login)
    if (response.data?.accessToken) {
      storedAccessToken = response.data.accessToken;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    //  Handle 401/403 errors (including modified tokens)
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry
    ) {
      // If token was modified, logout immediately
      const currentToken = localStorage.getItem("accessToken");
      if (currentToken && storedAccessToken && currentToken !== storedAccessToken) {
        console.error(" Token modified detected on 403. Logging out...");
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        console.error(" No refresh token found");
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        console.log(" Refreshing access token...");

        const { data } = await axios.post(
          `${API_BASE_URL}/api/auth/refresh-token`,
          { refreshToken }
        );

        if (data.accessToken) {
          console.log(" New access token received");
          localStorage.setItem("accessToken", data.accessToken);
          
          //  Update stored token reference
          storedAccessToken = data.accessToken;

          // Update the failed request with new token
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

          // Process queued requests
          processQueue(null, data.accessToken);

          return axiosInstance(originalRequest);
        } else {
          throw new Error("No access token in response");
        }
      } catch (refreshError) {
        console.error(" Token refresh failed:", refreshError.message);
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

