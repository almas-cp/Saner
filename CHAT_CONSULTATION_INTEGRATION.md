# Consultation Chats Integration Guide

This guide explains how medical consultations are integrated into the chat interface of your app, creating a seamless experience for both doctors and clients.

## Overview

When a doctor accepts a consultation request, the system automatically:
1. Creates a chat room entry in the `chats` table
2. Generates an initial system message
3. Makes the chat appear in both the doctor's and client's chat lists
4. Places consultation chats prominently above regular conversations

## Key Files and Changes

### 1. `app/(main)/professionals.tsx`

This file handles the consultation request and acceptance flow:

- When a doctor clicks "Accept" on a consultation request, `handleConsultationRequest` runs
- The function uses `createConsultationChat` (from chat_debug.tsx) to create a chat room
- The chat is created with both client and doctor information, making it visible to both users

### 2. `app/(main)/chat.tsx`

The main chat list page now:

- Shows a "Medical Consultations" section above regular conversations
- Fetches consultation chats using `fetchConsultationChats`
- Displays doctor/client role tags to distinguish the chat type
- Properly formats the chat items with appropriate styling

### 3. `app/(main)/chat/[id].tsx`

The chat detail page has been enhanced to:

- Support both regular connection chats and consultation chats
- Use different data fetching logic based on chat type
- Handle message sending with proper role tracking (client/professional)
- Show role badges in the chat header (Doctor/Client)
- Display system messages with a distinct style

## Database Structure

The consultation chat system uses these tables:

1. **consultations**: Tracks the consultation requests and their status
2. **chats**: Links consultations to chat rooms
3. **chat_messages**: Stores individual messages with sender type

## User Experience

### For Clients:
1. Client requests a consultation from a doctor
2. When the doctor accepts, a chat appears in the client's chat list
3. The chat is labeled with "Doctor" to indicate a medical consultation
4. Client can immediately start messaging the doctor

### For Doctors:
1. Doctor receives consultation requests in the professionals page
2. After accepting a request, a chat appears in their chat list
3. The chat is labeled with "Client" to indicate who they're helping
4. Doctor can immediately start messaging the client

## Testing the Integration

To verify the system is working correctly:

1. **Create a consultation request**:
   - Log in as a regular user
   - Go to the professionals page
   - Request a consultation with a doctor

2. **Accept the consultation**:
   - Log in as the doctor
   - Go to the professionals page
   - Find the pending consultation and accept it

3. **Verify chat creation**:
   - Check the chat page for both users
   - The new consultation chat should appear at the top under "Medical Consultations"
   - The chat should display the appropriate role tag (Doctor/Client)

4. **Test messaging**:
   - Open the chat and send messages as either user
   - Messages should appear in real-time for both parties
   - The system message should show consultation details

## Troubleshooting

If consultation chats aren't appearing:

1. **Check the database**:
   - Verify the `chats` table exists and has entries
   - Make sure the RLS policies allow proper access

2. **Review the logs**:
   - When accepting a consultation, detailed logs are generated
   - Look for any error messages about chat creation

3. **Refresh the app**:
   - Sometimes the UI needs a refresh to show new chats
   - Pull down on the chat list to trigger a refresh

## Database Tables Structure

```sql
-- Consultations table
CREATE TABLE public.consultations (
    id UUID PRIMARY KEY,
    client_id UUID REFERENCES public.profiles(id),
    professional_id UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL,
    fee_paid INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chats table
CREATE TABLE public.chats (
    id UUID PRIMARY KEY,
    consultation_id UUID REFERENCES public.consultations(id),
    client_id UUID REFERENCES public.profiles(id),
    professional_id UUID REFERENCES public.profiles(id),
    client_name TEXT,
    professional_name TEXT,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE,
    unread_client INTEGER DEFAULT 0,
    unread_professional INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY,
    chat_id UUID REFERENCES public.chats(id),
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    read BOOLEAN DEFAULT false
);
``` 