import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchProfile,
    initializeAuth,
    refreshProfile as refreshProfileThunk,
    setProfile,
    setSession,
    signOut as signOutThunk,
    UserProfile,
    UserRole
} from '../store/slices/authSlice';

export type { UserProfile, UserRole };

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        // Inisialisasi session awal ke Redux store
        dispatch(initializeAuth());

        // Sinkronisasi otomatis listener Supabase ke Redux store
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                dispatch(setSession(session));
                if (session?.user) {
                    // Hindari refetch profil berulang saat TOKEN_REFRESHED (misal saat window focus di desktop)
                    if (event !== 'TOKEN_REFRESHED') {
                        dispatch(fetchProfile(session.user.id));
                    }
                } else {
                    dispatch(setProfile(null));
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [dispatch]);

    return <>{children}</>;
};

export const useAuth = () => {
    const dispatch = useAppDispatch();
    const { user, session, profile, isLoading, error } = useAppSelector((state) => state.auth);

    const signOut = async () => {
        await dispatch(signOutThunk()).unwrap();
    };

    const refreshProfile = async () => {
        await dispatch(refreshProfileThunk()).unwrap();
    };

    return {
        user,
        session,
        profile,
        isLoading,
        error,
        signOut,
        refreshProfile,
    };
};