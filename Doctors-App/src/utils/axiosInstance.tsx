import axios from "axios";
import { BASE_URL } from "./apiPath";
import { requestTracker } from "./requestTracker";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Attach token on every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Count each request once for the loading bar (retries reuse the same config);
    // requests sent with { silent: true }, like background polling, aren't counted.
    if (!(config as any)._tracked && !(config as any).silent) {
      (config as any)._tracked = true;
      requestTracker.start();
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response: handle 401 + simple retry on network errors
axiosInstance.interceptors.response.use(
  (response) => {
    if ((response.config as any)._tracked) requestTracker.finish();
    return response;
  },
  async (error) => {
    const config = error.config;

    // Only retry on network/timeout errors, not 4xx/5xx
    const isNetworkError = !error.response;
    const isTimeout = error.code === "ECONNABORTED";
    const alreadyRetried = config?._retryCount >= 2;

    if ((isNetworkError || isTimeout) && !alreadyRetried && config) {
      config._retryCount = (config._retryCount || 0) + 1;
      // Wait 1s before retry
      await new Promise((res) => setTimeout(res, 1000 * config._retryCount));
      return axiosInstance(config);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
    }

    // only failures that reached a tracked request (not ones rejected before sending)
    if (config?._tracked) requestTracker.finish();
    return Promise.reject(error);
  },
);

export default axiosInstance;
