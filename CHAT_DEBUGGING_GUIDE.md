# Chat Debugging Guide

This guide will help you diagnose and fix issues with the chat functionality in your medical consultation app.

## Common Error: "Error creating chat room: {}"

If you see this error when accepting a consultation, it means the app is failing to create a chat room entry in the database. I've created enhanced debugging tools to help you fix this.

## Step 1: Make Sure Chat Tables Exist

The first common issue is that the chat tables might not exist in your database.

1. Verify you've run the `chat_tables.sql` script in your Supabase SQL Editor
2. This script creates:
   - The `chats` table
   - The `chat_messages` table 
   - Proper RLS policies
   - Helper functions

## Step 2: Add Debugging Utilities

I've created a powerful debugging utility to help diagnose issues:

1. Add the provided `chat_debug.tsx` file to your `src/lib` folder.
2. Make sure the import in `professionals.tsx` is pointing to the correct location:
   ```typescript
   import { 
     createConsultationChat, 
     logConsultationStatus, 
     inspectConsultation 
   } from '../../src/lib/chat_debug';
   ```

## Step 3: Update Your Code

Update the `handleConsultationRequest` function in `professionals.tsx` with the enhanced version I provided. This adds:

- Detailed logging
- Better error handling
- Diagnostic information
- Real-time table validation

## Step 4: Debug Using Chrome DevTools

1. Open your app in Chrome
2. Press F12 to open DevTools
3. Go to the Console tab
4. Look for logs with these prefixes:
   - ✅ Success messages
   - ⚠️ Warning messages
   - ❌ Error messages

## Common Issues and Fixes

### 1. "Chats table doesn't exist"

If you see `❌ CHATS TABLE IS MISSING!`, then:
1. Go to your Supabase SQL Editor
2. Paste and run the contents of `chat_tables.sql`
3. Verify the tables were created by running:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('chats', 'chat_messages');
   ```

### 2. "Permission denied" Error

If you see errors with code `42501`:
1. Check that your RLS policies are properly set up
2. Make sure they allow the currently logged-in user to insert into the chats table
3. Run this SQL to verify and fix policies:
   ```sql
   -- Drop any existing policies
   DROP POLICY IF EXISTS "Users can view all chats" ON public.chats;
   DROP POLICY IF EXISTS "Anyone can insert a chat they're part of" ON public.chats;
   
   -- Create more permissive policies
   CREATE POLICY "Users can view all chats" 
       ON public.chats
       FOR SELECT 
       USING (true);
       
   CREATE POLICY "Anyone can insert a chat they're part of" 
       ON public.chats
       FOR INSERT 
       WITH CHECK (true);
   ```

### 3. Sender ID Error

If you see a constraint violation error for `sender_id`:
1. The system message implementation might be failing
2. Try using a UUID instead of 'system' for the sender_id
3. Run this SQL to make the column more flexible:
   ```sql
   ALTER TABLE public.chat_messages 
   ALTER COLUMN sender_id TYPE TEXT;
   ```

## Diagnostic Tool Usage

I've added several diagnostic tools to help you:

### 1. `logConsultationStatus()`

This function prints a comprehensive log of your database state:
- Whether chat tables exist
- Recent consultations
- Existing chats

### 2. `inspectConsultation(consultationId)`

This function performs a deep inspection of a specific consultation:
- Checks if the consultation exists
- Validates client and professional profiles
- Checks if a chat already exists for this consultation

### 3. `createConsultationChat()`

This is an enhanced version of the chat creation logic with:
- Detailed error logging
- Error code analysis
- Better fallback behavior

## Testing Your Fix

After implementing these changes:
1. Try accepting a consultation again
2. Check the console logs for detailed diagnostic information
3. If you still see errors, the logs will help pinpoint exactly what's wrong

## Need More Help?

If you're still seeing issues after following this guide:
1. Try a more permissive approach to RLS policies temporarily
2. Check if your users have proper permissions
3. Look for any errors in your data structure
4. Consider using the Supabase dashboard to manually inspect tables

Remember that you can always use the diagnostic functions directly in your code to get more insights! 