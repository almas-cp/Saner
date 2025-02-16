# Saner Application Architecture and Workflows

## Overview
Saner is a React Native/Expo application with TypeScript that appears to be a mental health and wellness platform. The application uses modern technologies including Supabase for backend services, Expo Router for navigation, and React Native Paper for UI components.

## Tech Stack
- **Frontend Framework**: React Native with Expo
- **Language**: TypeScript
- **Backend**: Supabase
- **State Management**: React Context
- **UI Framework**: React Native Paper
- **Navigation**: Expo Router
- **Authentication**: Supabase Auth
- **Media Handling**: Expo AV, Image Picker
- **Voice/Speech**: Expo Speech, Voice Recognition

## Application Structure

### Directory Organization
```
├── app/                    # Main application routes (Expo Router)
│   ├── (auth)/            # Authentication routes
│   └── (main)/            # Main application routes
├── src/                    # Source code
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and service integrations
│   ├── styles/            # Styling and theme definitions
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── constants/         # Application constants
├── supabase/              # Supabase configuration
└── docs/                  # Documentation
```

## Core Workflows

### 1. Authentication Flow
- Entry point through `/app/(auth)` directory
- Routes:
  - `/login`: User login screen
  - `/signup`: New user registration
- Protected by AuthProvider context
- Integrates with Supabase authentication

### 2. Main Application Flow
The main application is organized into several key sections:

#### Profile Section (`/app/(main)/profile`)
- User profile management
- Settings and preferences
- Account customization

#### Discover Section (`/app/(main)/discover`)
- Content discovery interface
- Browsing and exploration features

#### Writing Section (`/app/(main)/write`)
- Content creation interface
- Text input and editing capabilities

#### Chat Interface (`/app/(main)/chat`)
- Messaging or communication features
- Real-time interaction capabilities

#### Breathing Exercises (`/app/(main)/breath`)
- Wellness and meditation features
- Breathing exercise tools

### 3. Theme System
- Supports both light and dark modes
- Customizable color schemes
- Managed through ThemeProvider context
- Integrates with React Native Paper theming

### 4. Media Features
The application includes robust media handling capabilities:
- Voice recognition and speech synthesis
- Image picking and handling
- Audio playback and recording
- File system operations

## Key Components

### Providers
1. `AuthProvider`: Manages authentication state
2. `ThemeProvider`: Handles theme switching and customization
3. `PaperProvider`: Provides UI theming through React Native Paper

### Navigation
- Uses Expo Router for file-based routing
- Implements protected routes
- Supports deep linking
- Maintains separate stacks for auth and main flows

### UI/UX Features
- Material Design 3 (MD3) theming
- Responsive layouts
- Safe area handling
- Gesture support
- Linear gradients for visual effects

## Data Flow
1. User authentication through Supabase
2. State management via React Context
3. Local storage using AsyncStorage
4. Real-time updates where applicable
5. File system interactions for media handling

## Security Features
- Secure authentication flow
- Protected routes
- Environment variable management
- Secure storage practices

## Performance Considerations
- Lazy loading of routes
- Optimized media handling
- Efficient state management
- Background task handling

## Development Workflow
- TypeScript for type safety
- Expo development environment
- Hot reloading support
- Cross-platform compatibility

## Future Considerations
- Scale backend services
- Enhance media processing
- Implement caching strategies
- Optimize performance
- Add offline support 