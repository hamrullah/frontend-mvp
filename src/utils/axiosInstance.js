// utils/axiosInstance.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // ganti true kalau pakai cookie httpOnly
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      // optional: redirect ke /login
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
