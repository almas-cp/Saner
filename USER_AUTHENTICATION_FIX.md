# Fixing the User Authentication & Missing Profile Issue

You're currently seeing this error when logging in with a user created directly in Supabase Auth:

```
Error fetching profile: {"code": "PGRST116", "details": "The result contains 0 rows", "hint": null, "message": "JSON object requested, multiple (or no) rows returned"}
```

## The Problem Explained

When you create a user in Supabase Auth, it only creates an entry in the `auth.users` table, but your application expects each user to also have a corresponding entry in the `profiles` table. This error happens because your code is trying to fetch a profile that doesn't exist yet.

## Two-Part Solution

I've created two files to solve this issue:

### 1. Database Fix: `auth_profile_trigger.sql`

This SQL script:
- Creates a trigger that automatically generates a profile whenever a new Auth user is created
- Creates a function to create profiles for all existing Auth users who don't have profiles yet
- Adds starter coins to the user's wallet (if the `user_coins` table exists)

**How to use it:**
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `auth_profile_trigger.sql`
4. Run the script

### 2. Application Fix: `handle_missing_profile.tsx`

This TypeScript utility function:
- Checks if a user has a profile
- Creates one if it doesn't exist
- Can be integrated into your components to handle this situation gracefully

**How to use it:**
1. Add this file to your project (in `src/lib` or another appropriate location)
2. Import and use the `ensureUserProfile` function in components that need profile data

## How to Update Your Code

Here's how to update your authentication flow:

```typescript
import { ensureUserProfile } from '../lib/handle_missing_profile';

// In your component:
useEffect(() => {
  const initAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Handle not logged in state
      return;
    }
    
    // First ensure the user has a profile
    const profileExists = await ensureUserProfile(user);
    if (!profileExists) {
      // Handle profile creation failure
      alert('Error creating your profile. Please try again or contact support.');
      return;
    }
    
    // Now you can safely fetch profile data or other user-related data
    fetchUserData();
  };
  
  initAuth();
}, []);
```

## Additional Improvements

Add this profile check to:

1. Your login/auth screens
2. Your main app layout component (that wraps authenticated pages)
3. Any component that specifically needs to access profile data

## Testing the Fix

1. Run the SQL script to set up the trigger and create profiles for existing users
2. Try logging in with your Supabase Auth user again
3. Check your database to verify a profile was created
4. Your application should now work correctly without the "no rows returned" error

If you have any issues with this implementation, please let me know! 