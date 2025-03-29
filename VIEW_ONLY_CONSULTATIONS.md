# View-Only Mode for Ended Consultations

After a doctor ends a consultation session, the chat transitions to a **view-only mode**. This document explains how this functionality works and how it's implemented.

## How View-Only Mode Works

When a consultation is ended:

1. The chat becomes **read-only** for both doctor and client
2. Both parties can still **view the complete chat history**
3. The message input is **disabled** with text indicating "This session has ended"
4. Any attempts to send messages will show an alert explaining the session has ended

## Technical Implementation

### Database Changes

1. **Chat Status Tracking**: A boolean column `is_active` in the `chats` table tracks whether the chat is active or ended
2. **Consultation Status**: The `consultations` table has a `status` field set to "completed" when ended
3. **Completion Timestamp**: A `completed_at` timestamp records when the consultation was ended

### Frontend Implementation

1. **UI Disabling**: When a chat is inactive, the input field is disabled and visually dimmed
2. **Alert Notifications**: Users trying to send messages will see an alert explaining the session has ended
3. **Double Validation**: Both client and server-side checks prevent message sending in ended sessions

### End-to-End Protection

The view-only protection is implemented at multiple levels:

1. **UI Level**: Input fields are disabled and visually show as inactive
2. **Client Logic**: The `sendMessage` function checks `isChatActive` before attempting to send
3. **API Level**: The `sendConsultationMessage` function in `consultationUtils.ts` checks chat status
4. **Database Level**: The `send_consultation_message` SQL function can also validate the consultation status

## Code Example

```typescript
// UI disabling of input
<TextInput
  value={newMessage}
  onChangeText={setNewMessage}
  placeholder={isChatActive ? "Type a message..." : "This session has ended"}
  placeholderTextColor={colors.TEXT.SECONDARY}
  style={[
    styles.input, 
    { 
      backgroundColor: colors.SURFACE,
      color: colors.TEXT.PRIMARY,
      opacity: isChatActive ? 1 : 0.6  // Visual dimming
    }
  ]}
  multiline
  editable={isChatActive}  // Disable input when inactive
/>

// Client-side protection in sendMessage function
if (!isChatActive) {
  logChat('Cannot send message: consultation session has ended');
  Alert.alert(
    "Session Ended",
    "This consultation session has ended. You cannot send new messages.",
    [{ text: "OK" }]
  );
  return;
}

// API-level protection in consultationUtils.ts
if (chatData?.is_active === false) {
  console.log('[Consultation] Cannot send message - consultation session has ended');
  return { 
    success: false, 
    error: 'This consultation session has ended. You cannot send new messages.' 
  };
}
```

## Visual Indicators

Users can immediately tell that a consultation has ended through several visual cues:

1. The input area appears dimmed and shows "This session has ended"
2. A system message in the chat states: "The doctor has ended this consultation session"
3. In the chat list, the ended consultation appears in the "Completed Consultations" section with a different style

## Benefits of View-Only Mode

1. **Preserves Medical Records**: Complete consultation history is maintained for reference
2. **Clear Boundaries**: Both parties understand when the professional relationship has concluded
3. **Prevents Confusion**: Avoids scenarios where a doctor might miss messages sent after a consultation ends
4. **Billing Clarity**: Makes it clear which messages were part of the billable consultation 