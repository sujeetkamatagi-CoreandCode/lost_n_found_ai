'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { User, UserRole } from '../database.types';

// Mock/Demo personas for immediate local development and testing
export const DEMO_USERS: User[] = [
  {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    email: 'alex.rivera@campus.edu',
    full_name: 'Alex Rivera',
    student_id: 'CS-2024-8901',
    phone: '+1 (555) 234-5678',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    department: 'Computer Science',
    role: 'student',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e',
    email: 'sarah.chen@campus.edu',
    full_name: 'Sarah Chen',
    student_id: 'BIO-2023-4512',
    phone: '+1 (555) 345-6789',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    department: 'Biological Sciences',
    role: 'student',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f',
    email: 'officer.johnson@campus.edu',
    full_name: 'Officer Mark Johnson',
    student_id: 'STAFF-9021',
    phone: '+1 (555) 911-4321',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    department: 'Campus Security & Lost Property Office',
    role: 'staff',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemoMode: boolean;
  isAuthenticated: boolean;
  switchDemoUser: (index: number) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const DEMO_STORAGE_KEY = 'campusfound-demo-index';
  const getInitialDemoUser = (): User => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      const idx = stored ? parseInt(stored, 10) : 0;
      if (!isNaN(idx) && DEMO_USERS[idx]) return DEMO_USERS[idx];
    }
    return DEMO_USERS[0];
  };

  const [user, setUser] = useState<User | null>(getInitialDemoUser());
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(DEMO_STORAGE_KEY) !== null || !localStorage.getItem('campusfound-auth');
    return true;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const ensureProfile = async (authUserId: string, fallbackEmail?: string, fallbackName?: string): Promise<User | null> => {
    let { data: profile } = await supabase.from('users').select('*').eq('id', authUserId).single();
    if (profile) return profile as User;
    // Create profile if missing (for newly signed up users without trigger)
    if (fallbackEmail) {
      const { data: newProfile, error } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          email: fallbackEmail,
          full_name: fallbackName || fallbackEmail.split('@')[0],
          role: 'student',
        })
        .select()
        .single();
      if (!error && newProfile) return newProfile as User;
      console.warn('Failed to auto-create profile:', error?.message);
    }
    return null;
  };

  const fetchSupabaseUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;
      if (authUser) {
        const profile = await ensureProfile(authUser.id, authUser.email || undefined, (authUser.user_metadata as any)?.full_name);
        if (profile) {
          setUser(profile);
          setIsDemoMode(false);
          setIsAuthenticated(true);
        } else {
          // Fallback to auth metadata
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            full_name: (authUser.user_metadata as any)?.full_name || authUser.email?.split('@')[0] || 'Campus User',
            student_id: null,
            phone: null,
            avatar_url: null,
            department: null,
            role: 'student',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          setIsDemoMode(false);
          setIsAuthenticated(true);
        }
      } else {
        // Check legacy getUser as fallback
        const { data: { user: legacyUser } } = await supabase.auth.getUser();
        if (legacyUser) {
          const profile = await ensureProfile(legacyUser.id, legacyUser.email || undefined, (legacyUser.user_metadata as any)?.full_name);
          if (profile) {
            setUser(profile);
            setIsDemoMode(false);
            setIsAuthenticated(true);
          }
        }
      }
    } catch (err) {
      console.warn('Supabase auth session not available, operating in demo mode', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Respect persisted demo choice - if demo was explicitly chosen, don't auto-override with supabase session on first load
    const hasPersistedDemo = typeof window !== 'undefined' && localStorage.getItem(DEMO_STORAGE_KEY) !== null;
    if (!hasPersistedDemo) {
      fetchSupabaseUser();
    } else {
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        localStorage.removeItem(DEMO_STORAGE_KEY);
        const profile = await ensureProfile(session.user.id, session.user.email || undefined, (session.user.user_metadata as any)?.full_name);
        if (profile) {
          setUser(profile);
          setIsDemoMode(false);
          setIsAuthenticated(true);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        // Don't force back to Alex if user was in demo mode with a different persona - keep current demo selection
        setIsDemoMode(true);
        setIsAuthenticated(false);
        setUser((prev) => {
          // If prev was already a demo user, keep it; otherwise default to stored demo or first
          if (prev && DEMO_USERS.some((d) => d.id === prev.id)) return prev;
          const stored = typeof window !== 'undefined' ? localStorage.getItem(DEMO_STORAGE_KEY) : null;
          const idx = stored ? parseInt(stored, 10) : 0;
          return DEMO_USERS[idx] || DEMO_USERS[0];
        });
        setLoading(false);
      } else if (session?.user) {
        // Only auto-set supabase user if not in demo mode or no persisted demo
        const hasDemo = typeof window !== 'undefined' && localStorage.getItem(DEMO_STORAGE_KEY) !== null;
        if (!hasDemo) {
          const profile = await supabase.from('users').select('*').eq('id', session.user.id).single().then(r => r.data);
          if (profile) {
            setUser(profile as User);
            setIsDemoMode(false);
            setIsAuthenticated(true);
          }
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const switchDemoUser = (index: number) => {
    if (DEMO_USERS[index]) {
      if (typeof window !== 'undefined') localStorage.setItem(DEMO_STORAGE_KEY, String(index));
      setUser(DEMO_USERS[index]);
      setIsDemoMode(true);
      setIsAuthenticated(false);
      setLoading(false);
      // Silently clear real session without forcing SIGNED_OUT to reset persona to index 0
      // Use setTimeout to avoid race with the state update above
      setTimeout(() => {
        supabase.auth.signOut().catch(()=>{});
      }, 100);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
    if (data.user) {
      const profile = await ensureProfile(data.user.id, data.user.email || email, (data.user.user_metadata as any)?.full_name);
      if (profile) {
        setUser(profile);
        setIsDemoMode(false);
        setIsAuthenticated(true);
      }
    }
    setLoading(false);
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'student') => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    // Supabase may require email confirmation; if session exists, proceed
    if (data.user) {
      // Try to create profile immediately (if not auto-created via trigger)
      const profile = await ensureProfile(data.user.id, email, fullName);
      if (profile) {
        // Update role if needed
        if (role !== 'student') {
          await supabase.from('users').update({ role }).eq('id', profile.id);
          profile.role = role;
        }
        // If we have a session, set authenticated state
        if (data.session) {
          setUser(profile);
          setIsDemoMode(false);
          setIsAuthenticated(true);
        }
      }
    }
    setLoading(false);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setUser(DEMO_USERS[0]);
    setIsDemoMode(true);
    setIsAuthenticated(false);
  };

  const refreshProfile = async () => {
    if (!isDemoMode && user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profile) setUser(profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode,
        isAuthenticated,
        switchDemoUser,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
