// src/features/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";

const initialState = {
  user: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
};

// ---- Centralized login endpoints (expand if you add more roles) ----
export const ENDPOINTS = {
  admin: "https://backend-mvp-nine.vercel.app/api/auth/login",
};

// ---- Role helpers ----
const ROLE_BY_ID = {
  5: "MEMBER",
  5: "VENDOR",
  6: "AFFILIATE",
  4: "ADMIN",
};

const pickLoginEndpoint = ({ role, endpoint }) => {
  if (endpoint) return endpoint; // explicit override wins
  const key = typeof role === "string" ? role.toLowerCase() : role;
  if (key && ENDPOINTS[key]) return ENDPOINTS[key];
  return ENDPOINTS.admin; // default
};

const normalizeError = (error, fallback) => {
  if (error?.response?.data) {
    return (
      error.response.data.message ||
      error.response.data.error ||
      JSON.stringify(error.response.data)
    );
  }
  return fallback;
};

// Build a normalized user object from getMe (or login) payload
const normalizeUserFromGetMe = (payload) => {
  // payload could be { user, profileType, profile } OR already a user object
  const apiUser = payload?.user || payload || {};

  // role string
  const roleFromId = ROLE_BY_ID[Number(apiUser.role_id)];
  const role = apiUser.role || roleFromId || "GUEST";

  // derive role_id without mixing ?? and ||
  const idFromRole = Number(
    Object.keys(ROLE_BY_ID).find((k) => ROLE_BY_ID[k] === role)
  );
  const role_id =
    apiUser.role_id != null
      ? apiUser.role_id
      : Number.isFinite(idFromRole)
      ? idFromRole
      : undefined;

  return { ...apiUser, role, role_id };
};

// ---- Thunks ----

// Login User (email/password)
export const LoginUser = createAsyncThunk(
  "auth/LoginUser",
  async (payload, thunkAPI) => {
    const { email, password, role, endpoint } = payload || {};
    try {
      const url = pickLoginEndpoint({ role, endpoint });
      const { data } = await axiosInstance.post(url, { email, password });

      // Your API: { message, token, user: { id, email, name, role_id, role } }
      if (data?.token) localStorage.setItem("token", data.token);

      // return a normalized envelope so reducers don't need to guess
      return {
        token: data?.token || null,
        user: data?.user || null,
        raw: data,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(normalizeError(error, "Login failed"));
    }
  }
);

// Get current user profile (canonical source for role)
export const getMe = createAsyncThunk("auth/getMe", async (_, thunkAPI) => {
  try {
    const { data } = await axiosInstance.get(
      "https://backend-mvp-nine.vercel.app/api/profile"
    );
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(normalizeError(error, "Unauthorized"));
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
      // ----- Login -----
      .addCase(LoginUser.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(LoginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        // If login returns a user, set it immediately so UI (Sidebar) has the role
        if (action.payload?.user) {
          state.user = normalizeUserFromGetMe({ user: action.payload.user });
        }
      })
      .addCase(LoginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || "Login failed";
      })

      // ----- getMe -----
      .addCase(getMe.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = normalizeUserFromGetMe(action.payload);
        // Example input:
        // {
        //   "user": { "id":2, "email":"admin@example.com", "name":"Super Admin", "role_id":4, "role":"ADMIN" },
        //   "profileType":"Admin",
        //   "profile": { ... }
        // }
        // After normalize: user.role === "ADMIN", user.role_id === 4
      })
      .addCase(getMe.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload || "Unauthorized";
        state.user = null;
      })

      // ----- Logout -----
      .addCase(LogOut.fulfilled, (state) => {
        state.user = null;
        state.isSuccess = false;
      });
  },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;
