import { supabase } from '../lib/supabase';

/**
 * Safely fetches a profile with fallback to prevent "no rows" errors
 * Use this anywhere you need to fetch profiles to avoid the PGRST116 error
 * 
 * @param userId - The user ID to fetch the profile for
 * @param logPrefix - Optional prefix for log messages
 * @returns Profile object (either real or fallback)
 */
export const fetchProfileSafely = async (userId: string, logPrefix = 'Profile') => {
  try {
    console.log(`[${logPrefix}] Fetching profile for ${userId}`);
    
    // Try to fetch the profile with maybeSingle() which doesn't throw when no rows are found
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileError) {
      console.log(`[${logPrefix}] Error fetching profile:`, profileError);
    }
    
    // If we have profile data, use it
    if (profileData) {
      console.log(`[${logPrefix}] Found profile for ${userId}: ${profileData.name}`);
      return profileData;
    }
    
    // Otherwise, return a fallback profile object
    console.log(`[${logPrefix}] No profile found for ${userId}, using fallback`);
    return {
      id: userId,
      name: 'User',
      username: null,
      profile_pic_url: null,
      is_doctor: false,
      // Include any other fields your app might expect
    };
  } catch (error) {
    console.error(`[${logPrefix}] Unexpected error fetching profile:`, error);
    
    // Return a fallback profile even on unexpected errors
    return {
      id: userId,
      name: 'User',
      username: null,
      profile_pic_url: null,
      is_doctor: false,
    };
  }
};

/**
 * Tries to create a profile if it doesn't exist
 * @param userId - The user ID to create a profile for
 * @returns true if successful, false otherwise
 */
export const createProfileIfMissing = async (userId: string): Promise<boolean> => {
  try {
    // Check if profile already exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
      
    // If profile exists or there was an error checking, exit
    if (data || error) {
      return !!data;
    }
    
    // Create a minimal profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: 'User',
        created_at: new Date().toISOString()
      });
      
    return !insertError;
  } catch (error) {
    console.error('Error in createProfileIfMissing:', error);
    return false;
  }
}; 