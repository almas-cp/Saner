# Completed Consultations Guide

## Overview

This document explains the implementation of a system for archiving completed medical consultations and their chat history. The feature allows doctors to end consultations, which moves them to an archive where they can be viewed but not modified.

## Key Components

### Database Structure

1. **New Tables:**
   - `completed_consultations`: Stores archived consultation records
   - `completed_chats`: Stores chat metadata for completed consultations
   - `completed_chat_messages`: Stores the message history for completed consultations

2. **Database Functions:**
   - `move_completed_consultation`: Moves a consultation and its chat history to the archive tables
   - `create_unique_consultation_chat`: Creates a chat with a unique ID for each consultation
   - `auto_move_completed_consultation`: Trigger function that automatically moves consultations when their status changes to 'completed' or 'ended'

### User Interface Components

1. **Completed Chats Toggle:**
   - Added to the main chat screen
   - Allows users to show/hide completed consultations

2. **Completed Chat View:**
   - Read-only interface for viewing archived consultation chats
   - Clearly marked as archived with visual indicators

3. **End Consultation Action:**
   - Available only to doctors in active consultations
   - Triggers the archiving process

## Process Flow

1. **Starting a Consultation:**
   - When a doctor accepts a consultation request, a unique chat is created using `create_unique_consultation_chat`
   - Each consultation gets its own unique chat ID, solving the issue of chat reuse

2. **Ending a Consultation:**
   - Doctor clicks the "End Consultation" button
   - Confirmation dialog is shown
   - `move_completed_consultation` function is called
   - Consultation data and chat history are moved to archive tables
   - Original data is deleted from active tables

3. **Viewing Completed Consultations:**
   - User toggles "Show Completed" on the chat screen
   - Completed consultations are fetched from `completed_chats` table
   - Clicking on a completed chat opens the read-only view

## Implementation Details

### SQL Migration

The `completed_consultations_migration.sql` script:
- Creates the new archive tables
- Sets up appropriate foreign key relationships
- Establishes row-level security policies
- Creates functions and triggers for automatic archiving

### Chat Interface Updates

1. **Chat List View Updates:**
   - Added state for completed consultations
   - Added toggle button for showing/hiding completed chats
   - Added rendering for completed chat items

2. **Completed Chat Detail View:**
   - Created a new screen at `/completed-chat/[id]`
   - Shows archived messages in a read-only format
   - Includes clear indication of archived status

3. **Consultation Ending:**
   - Added interface for doctors to end consultations
   - Implemented confirmation flow
   - Added status feedback

## Benefits

1. **Performance Improvement:**
   - Active tables stay lean by moving completed data to archive tables
   - Faster query times for active consultations

2. **Clear Separation:**
   - Active and completed consultations are clearly separated
   - Users can easily distinguish between ongoing and past consultations

3. **Data Retention:**
   - Historical consultation data is preserved
   - Users can reference past consultations

## Usage Guide

### For Doctors

1. **Ending a Consultation:**
   - Open an active consultation chat
   - Click the archive icon in the top-right corner
   - Confirm the action in the dialog
   - The consultation will be moved to the archive

2. **Viewing Past Consultations:**
   - Go to the chat screen
   - Click "Show Completed"
   - Select any completed consultation to view its history

### For Clients

1. **Viewing Past Consultations:**
   - Go to the chat screen
   - Click "Show Completed"
   - Select any completed consultation to view its history

## Troubleshooting

If you experience issues with the completed consultations feature:

1. **Missing Completed Consultations:**
   - Check that the `move_completed_consultation` function executed successfully
   - Verify that the user has appropriate permissions for the archived tables

2. **Errors When Ending Consultations:**
   - Check the database logs for specific error messages
   - Ensure all required tables and columns exist
   - Verify foreign key relationships

3. **UI Issues:**
   - Clear the app cache and restart
   - Check the console for JavaScript errors
   - Verify that your database connection is working

## Technical Notes

- The archived chat data is fully read-only; no new messages can be added
- Archived consultations are stored separately from active ones for performance reasons
- Each consultation is linked to its own unique chat, preventing the issue of consultation/chat reuse
- Row-level security is applied to all archive tables for data privacy 