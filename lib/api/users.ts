import { supabase } from '../supabaseClient';
import { User, UpdateUser, UserRole } from '../database.types';

/**
 * Fetch the currently authenticated user session and user profile.
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Fetch the current user's profile from the public.users table.
 */
export async function getCurrentUserProfile(): Promise<User | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching current user profile:', error.message);
    return null;
  }
  return data;
}

/**
 * Fetch a user profile by ID.
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching user ${userId}:`, error.message);
    return null;
  }
  return data;
}

/**
 * Update a user profile.
 */
export async function updateUserProfile(userId: string, updates: UpdateUser): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all users by role (e.g., 'staff' or 'admin').
 */
export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data || [];
}
