# Mental Health App Development Context

## App Overview
A React Native mental health application focused on social connection, mindfulness, and mental wellness tracking. The app provides a platform for users to share experiences, practice breathing exercises, connect with AI support, and maintain their profile.

## Technical Stack
- Framework: React Native with TypeScript
- Build Tool: Expo
- Navigation: Expo Router
- UI Framework: React Native Paper
- Backend/Database: Supabase
- Image Handling: Required for profile pictures and post images

## Core Features & Navigation

### Bottom Navigation Bar
Four main sections:
1. Discover
2. Breath
3. Chat
4. Profile

### 1. Discover Page
**Layout Components:**
- Header with page title "Discover"
- Search bar (right-aligned)
  - Functionality: Search users and posts
- Scrollable feed of post cards

**Post Card Components:**
- User information section
  - Profile picture
  - Username (clickable → user profile)
- Post content
  - Title
  - Creation date
  - Content text
  - Optional image
- Interaction buttons
  - Like button
  - Comment button

**Detail Views:**
- Post detail view (on post click)
- User profile view (on username click)
  - Profile picture
  - Full name
  - Username (Instagram-style format)
  - Friend request button
  - Grid/List of user's posts

### 2. Breath Page
**Components:**
- Mood slider
  - Left: Sad icon
  - Right: Happy icon
  - Gradient color transition (red → green)
- "Help me with" section
- 2x2 grid of assistance cards:
  1. Anger
  2. Anxiety
  3. Worry
  4. Depression

### 3. Chat Page
**Layout:**
- WhatsApp-style chat interface
- Contact list:
  - AI chatbot (Wall-E)
  - 3 friend chat options
- Chat features:
  - Message bubbles
  - Timestamp
  - Read receipts

### 4. Profile Page
**Features:**
- Editable components:
  - Profile picture
  - Full name
  - Username
- Settings and preferences
- Account management

## Data Models

### User
```typescript
interface User {
  id: string;
  username: string;
  fullName: string;
  profilePicture: string;
  friends: string[];
  posts: Post[];
}
```

### Post
```typescript
interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: Date;
  likes: number;
  comments: Comment[];
}
```

### Message
```typescript
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}
```

### MoodTracking
```typescript
interface MoodTracking {
  id: string;
  userId: string;
  moodScore: number;
  timestamp: Date;
}
```

## Design Guidelines

### Color Palette
- Primary colors:
  - Primary: #6B4DE6 (Soft Purple)
  - Secondary: #83C5BE (Calming Teal)
- Accent colors:
  - Mood slider: #FF6B6B (Soft Red) → #4AD66D (Healing Green)
  - Warning: #FFB347 (Soft Orange)
  - Success: #4AD66D (Healing Green)
- Text colors:
  - Primary: #2C3E50 (Dark Blue-Gray)
  - Secondary: #7F8C8D (Medium Gray)
  - Tertiary: #BDC3C7 (Light Gray)
- Background colors:
  - Primary: #FFFFFF (White)
  - Secondary: #F8F9FA (Off-White)
  - Tertiary: #F1F3F5 (Light Gray)
  - Card: #FFFFFF (White)

### Typography
- Headings:
  - Font Family: "SF Pro Display" (iOS) / "Roboto" (Android)
  - H1: 28px, Bold
  - H2: 24px, Bold
  - H3: 20px, Semibold
  - H4: 18px, Semibold
- Body text:
  - Font Family: "SF Pro Text" (iOS) / "Roboto" (Android)
  - Regular: 16px
  - Small: 14px
  - Caption: 12px
- Button text:
  - Size: 16px
  - Weight: Semibold
  - Case: Sentence case

### Spacing
- Standard padding:
  - Screen padding: 16px
  - Content padding: 12px
  - Element padding: 8px
- Card spacing:
  - Vertical gap: 16px
  - Horizontal gap: 12px
  - Internal padding: 16px
- Grid spacing:
  - Column gap: 12px
  - Row gap: 12px
- Component spacing:
  - Between sections: 24px
  - Between related elements: 8px
  - Between unrelated elements: 16px

### Component Styling
- Cards:
  - Border radius: 12px
  - Shadow: 0px 2px 8px rgba(0, 0, 0, 0.08)
  - Background: #FFFFFF
- Buttons:
  - Height: 48px
  - Border radius: 8px
  - Primary: Filled background
  - Secondary: Outlined with 1.5px border
- Input fields:
  - Height: 48px
  - Border radius: 8px
  - Border: 1.5px solid #E0E0E0
  - Active border: 1.5px solid #6B4DE6
- Icons:
  - Navigation: 24x24px
  - Action items: 20x20px
  - Decorative: 16x16px

## Navigation Implementation

### Stack Configuration
```typescript
type RootStackParamList = {
  Main: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string };
  Settings: undefined;
  BreathingExercise: { exerciseType: string };
};

type BottomTabParamList = {
  Discover: undefined;
  Breath: undefined;
  Chat: undefined;
  Profile: undefined;
};
```

### Screen Transitions
- Default transitions:
  - Horizontal slide for stack navigation
  - Fade for tab navigation
- Custom transitions for modal screens
- Gesture-based navigation enabled

## API Integration

### Endpoints Structure
```typescript
interface ApiEndpoints {
  auth: {
    login: '/auth/login';
    register: '/auth/register';
    refresh: '/auth/refresh';
  };
  posts: {
    list: '/posts';
    create: '/posts';
    detail: (id: string) => `/posts/${id}`;
  };
  users: {
    profile: (id: string) => `/users/${id}`;
    update: (id: string) => `/users/${id}`;
  };
  messages: {
    list: '/messages';
    send: '/messages';
    history: (userId: string) => `/messages/${userId}`;
  };
}
```

### Error Handling
```typescript
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  status: number;
}
```

### Backend
- Supabase for:
  - Database management
  - Authentication
  - Real-time subscriptions
  - File storage
  - Serverless functions
