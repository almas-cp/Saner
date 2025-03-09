# Database and Application Fix Instructions

## Overview of Issues

1. **Missing Relationship Between Tables**: The errors show that your application cannot find a relationship between 'consultations' and 'client_id'.
2. **Duplicate Key Violation**: When creating consultation requests, you get an error about violating a unique constraint called "unique_active_consultation".
3. **Row Level Security (RLS) Issues**: Previous errors indicated problems with the RLS policies when trying to insert data.

## Important Updates to the Fix

Based on your feedback, I've made these critical improvements:

1. **Fixed the Syntax Error** in the `consultations_fix.sql` file:
   - Changed the `CONSTRAINT` with a `WHERE` clause to a proper partial unique index
   - This resolves the PostgreSQL syntax error you were seeing

2. **Protected Your Profiles Table**:
   - The SQL scripts will no longer attempt to recreate or modify your existing profiles table
   - Instead, they will only check for and add an `is_doctor` column if it doesn't exist
   - All existing data is preserved completely

## How to Fix

### Step 1: Fix the Database Schema

I've created two SQL files that will fix your database schema issues. You need to run these SQL queries in your Supabase SQL editor:

1. **First run `consultations_fix.sql`**:
   - This creates/recreates the `consultations` table with proper relationships
   - Sets up appropriate RLS policies
   - Adds a partial unique index to prevent duplicate active consultations

2. **Then run `medical_professionals_fix.sql`**:
   - Does NOT modify your existing profiles table data
   - Creates/updates the `medical_professionals` table
   - Sets up a trigger that automatically creates medical professional entries when profiles are marked as doctors
   - Populates existing doctor profiles with medical professional entries
   - Fixes RLS policies to be more permissive

### Step 2: Update Your Application Code

I've already updated the `professionals.tsx` file to work with the improved database schema. Key changes include:

1. **Updated fetchProfessionals function**:
   - Now works correctly with the updated schema
   - No longer needs to create medical professional entries manually
   - Better handles search and filtering

2. **Updated fetchConsultations function**:
   - Now properly handles both doctor and regular user views
   - Uses correct foreign key relationships
   - Provides better error handling

3. **Fixed requestConsultation function**:
   - Now checks for existing active/pending consultations before creating new ones
   - Avoids the duplicate key error

### Step 3: Test Your Application

After completing steps 1 and 2:

1. Try loading the professionals page to see if doctors are listed
2. Try requesting a consultation with a doctor
3. Check both user and professional views of consultations

## SQL File Instructions

To run the SQL files:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor section
3. Copy and paste the contents of `consultations_fix.sql` first, and run it
4. Then copy and paste the contents of `medical_professionals_fix.sql` and run it

## Expected Results

After implementing these fixes:

1. Doctor profiles (with `is_doctor=true`) will automatically have corresponding entries in the `medical_professionals` table
2. The medical professionals page will show all doctors
3. Users can request consultations without facing duplicate key errors
4. Both users and professionals can view their consultations

If you encounter any further issues after implementing these fixes, please let me know! 