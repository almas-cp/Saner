// Utility function to handle missing profiles in React components
// Add this to your src/lib folder or wherever you keep utility functions

import { AuthError, User } from '@supabase/supabase-js';
import { supabase } from '../../src/lib/supabase';

/**
 * Ensures a user has a profile, creating one if it doesn't exist
 * Call this function when you get a "no rows returned" error when fetching profiles
 */
export const ensureUserProfile = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  
  try {
    // Check if profile exists
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
      
    // If profile exists, return true
    if (profile) return true;
    
    // If error is not "no rows returned", something else is wrong
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking profile:', error);
      return false;
    }
    
    // Create a new profile for the user
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name: user.user_metadata?.name || user.user_metadata?.full_name || 'New User',
        username: user.user_metadata?.preferred_username || user.email,
        is_doctor: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (insertError) {
      console.error('Error creating profile:', insertError);
      return false;
    }
    
    // Try to create a coin wallet (ignore error if user_coins table doesn't exist)
    try {
      await supabase
        .from('user_coins')
        .insert({
          user_id: user.id,
          coins: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (coinError) {
      console.log('Note: Could not create coin wallet. This is OK if the table doesn\'t exist yet.');
    }
    
    console.log('Created new profile for user:', user.id);
    return true;
  } catch (error) {
    console.error('Unexpected error ensuring profile exists:', error);
    return false;
  }
};

/**
 * Enhances a component to handle auth and missing profiles
 * Usage example in a component:
 * 
 * useEffect(() => {
 *   const handleAuth = async () => {
 *     const { data: { user } } = await supabase.auth.getUser();
 *     if (user) {
 *       // First ensure profile exists
 *       const profileExists = await ensureUserProfile(user);
 *       if (profileExists) {
 *         // Then proceed with fetching profile data
 *         fetchUserData();
 *       } else {
 *         alert('Could not create your profile. Please contact support.');
 *       }
 *     }
 *   };
 *   
 *   handleAuth();
 * }, []);
 */ 