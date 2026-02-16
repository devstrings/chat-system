import axios from "axios";
import API_BASE_URL from "../config/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

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

let store;
export const injectStore = (_store) => {
  store = _store;
  console.log(" Store injected successfully");
};

let lastValidToken = localStorage.getItem("accessToken");

const performLogout = (reason = "Token invalid") => {
  console.error(` PERFORMING LOGOUT: ${reason}`);

  localStorage.clear();
  lastValidToken = null;

  if (store) {
    store.dispatch({ type: "auth/logout/fulfilled" });
  }

  setTimeout(() => {
    window.location.href = "/login";
  }, 100);
};

//  Only check if token was manually changed
const checkTokenModification = () => {
  const currentToken = localStorage.getItem("accessToken");

  // Skip if no token
  if (!currentToken) {
    console.log(" No token - skipping check");
    return true;
  }

  // Initialize if first time
  if (!lastValidToken) {
    console.log(" Initializing lastValidToken");
    lastValidToken = currentToken;
    return true;
  }

  // Check mismatch
  if (currentToken !== lastValidToken) {
    console.error(" TOKEN MISMATCH DETECTED!");
    console.log("Expected:", lastValidToken.substring(0, 30) + "...");
    console.log("Found:", currentToken.substring(0, 30) + "...");
    performLogout("Token manually modified");
    return false;
  }

  return true;
};

const updateTokenReference = (newToken) => {
  if (newToken) {
    console.log(" Updating token reference");
    lastValidToken = newToken;
    localStorage.setItem("accessToken", newToken);
  }
};

// REQUEST INTERCEPTOR
axiosInstance.interceptors.request.use(
  (config) => {
    const publicRoutes = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/refresh-token",
    ];
    const isPublicRoute = publicRoutes.some((route) =>
      config.url?.includes(route),
    );

    //  SKIP check for public routes
    if (!isPublicRoute && !checkTokenModification()) {
      return Promise.reject(new Error("Token modified"));
    }

    const accessToken = localStorage.getItem("accessToken");

    if (accessToken && !isPublicRoute) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// RESPONSE INTERCEPTOR
axiosInstance.interceptors.response.use(
  (response) => {
    //  Update token reference on successful response with new token
    if (response.data?.accessToken) {
      console.log(" New token received in response");
      updateTokenReference(response.data.accessToken);

      if (store) {
        store.dispatch({
          type: "auth/updateToken",
          payload: response.data.accessToken,
        });
      }
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    console.error(` Response error: ${status} ${originalRequest?.url}`);

    //  ONLY handle 401 (not 403)
    if (status === 401) {
      console.log(" 401 Error - attempting token refresh");

      // Prevent infinite loops
      if (originalRequest._retry) {
        console.error(" Already retried - LOGOUT");
        performLogout("Authentication retry failed");
        return Promise.reject(error);
      }

      // Queue requests during refresh
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            performLogout("Token refresh queue failed");
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        performLogout("No refresh token found");
        return Promise.reject(error);
      }

      try {
        console.log(" Calling refresh token API...");

        const { data } = await axios.post(
          `${API_BASE_URL}/api/auth/refresh-token`,
          { refreshToken },
        );

        if (data.accessToken) {
          console.log(" New access token received");

          //  Update reference FIRST
          updateTokenReference(data.accessToken);

          if (store) {
            store.dispatch({
              type: "auth/updateToken",
              payload: data.accessToken,
            });
          }

          // Retry all queued requests
          processQueue(null, data.accessToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return axiosInstance(originalRequest);
        } else {
          throw new Error("No access token in response");
        }
      } catch (refreshError) {
        console.error(" Token refresh failed:", refreshError.message);
        processQueue(refreshError, null);
        performLogout("Token refresh failed");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    //  For 403, don't auto-logout (might be permissions issue)
    if (status === 403) {
      console.error(" 403 Forbidden - Check backend permissions");
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
