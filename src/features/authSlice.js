import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";

const initialState = {
  user: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
};

// Centralize login endpoints
export const ENDPOINTS = {
  admin: "https://backend-mvp-nine.vercel.app/api/auth/login",
};

// --- helpers
const pickLoginEndpoint = ({ role, endpoint }) => {
  if (endpoint) return endpoint; // explicit override
  if (role && ENDPOINTS[role]) return ENDPOINTS[role];
  return ENDPOINTS.admin; // default
};

const normalizeError = (error, fallback) => {
  if (error?.response?.data) {
    // try common shapes
    return (
      error.response.data.message ||
      error.response.data.error ||
      JSON.stringify(error.response.data)
    );
  }
  return fallback;
};

// Login User (email/password)
export const LoginUser = createAsyncThunk(
  "auth/LoginUser",
  async (payload, thunkAPI) => {
    const { email, password, role, endpoint } = payload || {};
    try {
      const url = pickLoginEndpoint({ role, endpoint });
      const response = await axiosInstance.post(url, { email, password });

      // Expecting a token in response; support common keys
      const token =
        response?.data?.token ||
        response?.data?.accessToken ||
        response?.data?.data?.token;
      if (token) localStorage.setItem("token", token);

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        normalizeError(error, "Login failed")
      );
    }
  }
);

// Get current user profile
export const getMe = createAsyncThunk("auth/getMe", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get(
      "https://backend-mvp-nine.vercel.app/api/profile"
    );
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(
      normalizeError(error, "Unauthorized")
    );
  }
});

// Logout
export const LogOut = createAsyncThunk("auth/LogOut", async () => {
  localStorage.removeItem("token");
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(LoginUser.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(LoginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Some APIs return the user object; others just token
        state.user = action.payload?.user || action.payload?.data || state.user;
      })
      .addCase(LoginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || "Login failed";
      })
      .addCase(getMe.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Support either { user: {...} } or the user object directly
        state.user = action.payload?.user || action.payload;
      })
      .addCase(getMe.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || "Unauthorized";
        state.user = null;
      })
      .addCase(LogOut.fulfilled, (state) => {
        state.user = null;
        state.isSuccess = false;
      });
  },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;
