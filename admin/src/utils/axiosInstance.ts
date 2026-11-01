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
    const dtoken = localStorage.getItem("dToken");
    const atoken = localStorage.getItem("aToken");
    if (config.url?.includes("/admin") && atoken) {
      config.headers.Authorization = `Bearer ${atoken}`;
    } else if (dtoken) {
      config.headers.Authorization = `Bearer ${dtoken}`;
    }
    (config as any)._tracked = true;
    requestTracker.start();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => {
    requestTracker.finish();
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("dToken");
      localStorage.removeItem("aToken");
    }
    if (error.config?._tracked) requestTracker.finish();
    return Promise.reject(error);
  },
);

export default axiosInstance;
