import { AuthError, User } from '@supabase/supabase-js';
import { supabase } from '../../src/lib/supabase';

// Type for table info
interface ColumnInfo {
  column_name: string;
  data_type: string;
}

/**
 * Get columns that exist in a table
 */
async function getTableColumns(tableName: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName);
    
  if (error || !data) {
    console.error('Error fetching table schema:', error);
    // Fallback to common profile columns if we can't get the schema
    return ['id', 'name', 'username'];
  }
  
  return data.map(col => col.column_name);
}

/**
 * Ensures a user has a profile, creating one if it doesn't exist
 * This version dynamically adapts to your profiles table schema
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
    
    // Get the columns that exist in the profiles table
    const columns = await getTableColumns('profiles');
    
    // Create insert object with only columns that exist in the table
    const insertData: Record<string, any> = {
      id: user.id,
    };
    
    // Add fields if they exist in the table
    if (columns.includes('name')) {
      insertData.name = user.user_metadata?.name || user.user_metadata?.full_name || 'New User';
    }
    
    if (columns.includes('username')) {
      insertData.username = user.user_metadata?.preferred_username || user.email;
    }
    
    if (columns.includes('is_doctor')) {
      insertData.is_doctor = false;
    }
    
    // Only add timestamps if those columns exist
    if (columns.includes('created_at')) {
      insertData.created_at = new Date().toISOString();
    }
    
    if (columns.includes('updated_at')) {
      insertData.updated_at = new Date().toISOString();
    }
    
    // Create a new profile for the user
    const { error: insertError } = await supabase
      .from('profiles')
      .insert(insertData);
      
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