import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export type UserRole = 'superadmin' | 'marketing' | 'production' | 'finance' | 'client';

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  error: null,
};

// Async thunk to fetch profile by user id
export const fetchProfile = createAsyncThunk<UserProfile | null, string, { rejectValue: string }>(
  'auth/fetchProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return rejectWithValue(error.message);
      }
      return data as UserProfile;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching profile';
      return rejectWithValue(message);
    }
  }
);

// Async thunk to initialize authentication state
export const initializeAuth = createAsyncThunk<Session | null, void>(
  'auth/initializeAuth',
  async (_, { dispatch }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      dispatch(fetchProfile(session.user.id));
    }
    return session;
  }
);

// Async thunk to sign in with email and password
export const signInWithEmail = createAsyncThunk<
  { user: User | null; session: Session | null },
  { email: string; password: string },
  { rejectValue: string }
>(
  'auth/signInWithEmail',
  async ( credentials, { dispatch, rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password.trim(),
      });

      if (error) {
        let message = error.message;
        if (message.includes('Invalid login credentials')) {
          message = 'Login gagal, periksa email dan kata sandi Anda.';
        } else if (message.includes('Load failed')) {
          message = 'Koneksi ke Supabase gagal. Silakan periksa koneksi internet atau konfigurasi server.';
        }
        return rejectWithValue(message);
      }
      if (data.user) {
        dispatch(fetchProfile(data.user.id));
      }
      return { user: data.user, session: data.session };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal masuk. Silakan coba lagi.';
      if (message.includes('Login Failed') || message.includes('Failed to fetch')) {
        return rejectWithValue(
          'Koneksi ke Supabase gagal. Silakan periksa koneksi internet atau konfigurasi server.'
        );
      }
      return rejectWithValue(message);
    }
  }
);

// Async thunk to sign out
export const signOut = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return rejectWithValue(error.message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal keluar.';
      return rejectWithValue(message);
    }
  }
);

// Async thunk to refresh current user's profile
export const refreshProfile = createAsyncThunk<UserProfile | null, void, { rejectValue: string }>(
  'auth/refreshProfile',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    const userId = state.auth.user?.id;
    if (!userId) {
      return rejectWithValue('User belum login');
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return rejectWithValue(error.message);
      }
      return data as UserProfile;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error refreshing profile';
      return rejectWithValue(message);
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<Session | null>) => {
      state.session = action.payload;
      state.user = action.payload?.user ?? null;
      if (!action.payload) {
        state.profile = null;
      }
      state.isLoading = false;
    },
    setProfile: (state, action: PayloadAction<UserProfile | null>) => {
      state.profile = action.payload;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.session = null;
      state.profile = null;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // initializeAuth
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.session = action.payload;
        state.user = action.payload?.user ?? null;
        if (!action.payload) {
          state.isLoading = false;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
      });

    // fetchProfile
    builder
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.profile = null;
        state.isLoading = false;
      });

    // signInWithEmail
    builder
      .addCase(signInWithEmail.pending, (state) => {
        state.error = null;
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.session = action.payload.session;
        state.user = action.payload.user;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.error = action.payload ?? 'Login gagal';
      });

    // signOut
    builder
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.session = null;
        state.profile = null;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Logout gagal';
      });

    // refreshProfile
    builder
      .addCase(refreshProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.isLoading = false;
      })
      .addCase(refreshProfile.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { setSession, setProfile, setLoading, setError, clearAuth } = authSlice.actions;

export default authSlice.reducer;
