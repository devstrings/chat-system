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

//  REDUX STORE INJECT
let store;
export const injectStore = (_store) => {
  store = _store;
  console.log(' Store injected successfully');
};

// TRACK LAST VALID TOKEN - Initialize AFTER login
let lastValidToken = null;

//  LOGOUT HELPER
const performLogout = (reason = "Token invalid") => {
  console.error(` PERFORMING LOGOUT: ${reason}`);
  
  localStorage.clear();
  lastValidToken = null;
  
  if (store) {
    console.log(' Dispatching logout action to Redux...');
    store.dispatch({ type: 'auth/logout/fulfilled' });
  }
  
  console.log(' Redirecting to /login...');
  setTimeout(() => {
    window.location.href = "/login";
  }, 100);
};

//  CHECK TOKEN MODIFICATION
const checkTokenModification = () => {
  const currentToken = localStorage.getItem("accessToken");
  
  //  Initialize lastValidToken if not set yet (first request after login)
  if (!lastValidToken && currentToken) {
    console.log(' Initializing lastValidToken on first request');
    lastValidToken = currentToken;
    return true;
  }
  
  console.log(' Checking token modification...');
  console.log('  Current:', currentToken?.substring(0, 30));
  console.log('  Last Valid:', lastValidToken?.substring(0, 30));
  
  // Skip check if no tokens exist
  if (!currentToken && !lastValidToken) {
    console.log(' No tokens - skipping check');
    return true;
  }
  
  // Token manually changed
  if (lastValidToken && currentToken && currentToken !== lastValidToken) {
    console.error("TOKEN MISMATCH DETECTED!");
    console.log("Expected:", lastValidToken.substring(0, 30) + "...");
    console.log("Found:", currentToken.substring(0, 30) + "...");
    performLogout("Token has been manually modified");
    return false;
  }
  
  console.log(' Token check passed');
  return true;
};

//  UPDATE TOKEN REFERENCE
const updateTokenReference = (newToken) => {
  if (newToken) {
    console.log(" Updating token reference:", newToken.substring(0, 30) + "...");
    lastValidToken = newToken;
    localStorage.setItem("accessToken", newToken);
  }
};

// REQUEST INTERCEPTOR
axiosInstance.interceptors.request.use(
  (config) => {
    const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh-token'];
    const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));
    
    if (!isPublicRoute) {
      if (!checkTokenModification()) {
        return Promise.reject(new Error("Token modified"));
      }
    }
    
    const accessToken = localStorage.getItem("accessToken");
    
    if (accessToken && !isPublicRoute) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => {
    console.error(" Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR
axiosInstance.interceptors.response.use(
  (response) => {
    //  Update token reference when new token is received
    if (response.data?.accessToken) {
      console.log(' New token received in response');
      updateTokenReference(response.data.accessToken);
      
      if (store) {
        store.dispatch({
          type: 'auth/updateToken',
          payload: response.data.accessToken,
        });
      }
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    console.error(`Response error: ${status} ${originalRequest?.url}`);

    if (status === 401 || status === 403) {
      console.log(' 401/403 Error detected');
      
      // Check token modification
      const currentToken = localStorage.getItem("accessToken");
      
      if (lastValidToken && currentToken && currentToken !== lastValidToken) {
        console.error(' TOKEN MODIFIED - IMMEDIATE LOGOUT');
        performLogout("Token modified detected on 403/401");
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        console.error(" Already retried - LOGOUT");
        performLogout("Authentication retry failed");
        return Promise.reject(error);
      }

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
        console.log("Calling refresh token API...");

        const { data } = await axios.post(
          `${API_BASE_URL}/api/auth/refresh-token`,
          { refreshToken }
        );

        if (data.accessToken) {
          console.log(" New access token received");
          
          updateTokenReference(data.accessToken);

          if (store) {
            store.dispatch({
              type: 'auth/updateToken',
              payload: data.accessToken,
            });
          }

          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          processQueue(null, data.accessToken);
          
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

    return Promise.reject(error);
  }
);

// Debug helper
window.debugAxios = {
  getCurrentToken: () => localStorage.getItem("accessToken"),
  getLastValidToken: () => lastValidToken,
  checkMatch: () => {
    const current = localStorage.getItem("accessToken");
    const last = lastValidToken;
    console.log('🔍 Token Match Check:');
    console.log('  Current:', current?.substring(0, 30));
    console.log('  Last Valid:', last?.substring(0, 30));
    console.log('  Match?', current === last);
    return current === last;
  },
  forceLogout: () => {
    performLogout("Manual logout via debugAxios");
  }
};

export default axiosInstance;