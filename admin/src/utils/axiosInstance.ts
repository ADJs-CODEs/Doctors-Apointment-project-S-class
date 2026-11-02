import axios from "axios";
import { BASE_URL } from "./apiPath";
import { requestTracker } from "./requestTracker";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    // each API area uses its own login; remember which, so a 401 only clears that one
    const key = config.url?.startsWith("/api/pharmacy")
      ? "pToken"
      : config.url?.includes("/admin") && localStorage.getItem("aToken")
        ? "aToken"
        : "dToken";
    const token = localStorage.getItem(key);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      (config as any)._tokenKey = key;
    }
    // requests sent with { silent: true }, like background refreshes, don't move the bar
    if (!(config as any)._tracked && !(config as any).silent) {
      (config as any)._tracked = true;
      requestTracker.start();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => {
    if ((response.config as any)._tracked) requestTracker.finish();
    return response;
  },
  (error) => {
    // only the login that was refused is dropped (a wrong password sends no token at all)
    if (error.response?.status === 401 && error.config?._tokenKey) {
      localStorage.removeItem(error.config._tokenKey);
    }
    if (error.config?._tracked) requestTracker.finish();
    return Promise.reject(error);
  },
);

export default axiosInstance;
