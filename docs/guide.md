# Mental Health App - Project Overview & AI Development Guide

## Project Purpose
This is a React Native mental health application designed to provide users with a supportive digital environment for mental wellness. The app combines social connectivity, mindfulness practices, and mental health tracking to create a comprehensive mental wellness platform.

## Technical Stack Details

### Frontend
- React Native with TypeScript for type-safe development
- Expo for cross-platform development and easy deployment
- Expo Router for file-based routing
- React Native Paper for consistent UI components and theming

### Backend
- Supabase for:
  - Database management
  - Authentication
  - Real-time subscriptions
  - File storage
  - Serverless functions

### Development Tools
- Expo CLI for development workflow
- TypeScript for static typing
- ESLint and Prettier for code quality

## Core Value Proposition
- Provide a safe space for users to share mental health experiences
- Offer guided breathing exercises and mood management tools
- Enable AI-powered supportive conversations
- Foster community through social connections
- Track mental wellness progress over time

## AI Development Assistance Guidelines

### 1. Code Generation Context
When generating code for this project, consider:
- React Native best practices and performance optimization
- Cross-platform compatibility (iOS/Android)
- Strict TypeScript implementation
- Accessibility features for mental health users
- Privacy-first approach for sensitive data

### 2. Component Development Priorities
When assisting with components, focus on:
- Clean, maintainable code structure
- Proper TypeScript interfaces and types
- Consistent styling using the design system
- Performance optimization for smooth animations
- Error handling and edge cases
- Accessibility implementation

### 3. Data Model Implementation
When working with data models:
- Enforce strict typing for all interfaces
- Implement proper validation
- Consider offline capabilities
- Ensure secure data handling
- Follow normalized data structure patterns

### 4. Feature-Specific Guidelines

#### Discover Feed
- Implement efficient list rendering
- Handle image loading and caching
- Manage post interaction states
- Consider pagination and infinite scroll
- Implement search optimization

#### Breathing Exercises
- Focus on smooth animations
- Implement precise timing mechanisms
- Consider offline functionality
- Ensure accurate progress tracking
- Handle interruptions gracefully

#### Chat System
- Implement real-time messaging
- Handle message persistence
- Manage chat history efficiently
- Implement typing indicators
- Consider message encryption

#### Profile Management
- Handle image upload/compression
- Implement form validation
- Manage user preferences
- Handle authentication states
- Implement secure data updates

### 5. Design System Implementation

#### Colors
```typescript
const colors = {
  primary: '#6B4DE6',    // Soft Purple
  secondary: '#83C5BE',  // Calming Teal
  accent: {
    warning: '#FFB347',  // Soft Orange
    success: '#4AD66D',  // Healing Green
    moodBad: '#FF6B6B',  // Soft Red
    moodGood: '#4AD66D', // Healing Green
  },
  text: {
    primary: '#2C3E50',   // Dark Blue-Gray
    secondary: '#7F8C8D', // Medium Gray
    tertiary: '#BDC3C7',  // Light Gray
  },
  background: {
    primary: '#FFFFFF',   // White
    secondary: '#F8F9FA', // Off-White
    tertiary: '#F1F3F5',  // Light Gray
  }
}
```

#### Typography
```typescript
const typography = {
  heading: {
    h1: { size: 28, weight: 'bold' },
    h2: { size: 24, weight: 'bold' },
    h3: { size: 20, weight: 'semibold' },
    h4: { size: 18, weight: 'semibold' },
  },
  body: {
    regular: 16,
    small: 14,
    caption: 12,
  }
}
```

### 6. AI Assistance Focus Areas

#### Code Generation
- Component scaffolding
- Type definitions
- State management implementations
- API integration
- Animation logic
- Form validation
- Error handling

#### Code Review Guidance
- Performance optimization
- Security best practices
- Accessibility improvements
- Code organization
- State management patterns
- Error handling coverage
- Type safety

#### Problem Solving
- UI/UX implementation challenges
- State management complexities
- Data flow optimization
- Animation performance
- Cross-platform compatibility
- Security considerations
- Accessibility requirements

### 7. Testing Considerations
When implementing tests, focus on:
- Component rendering
- User interactions
- State management
- API integration
- Error scenarios
- Accessibility
- Cross-platform behavior

### 8. Performance Guidelines
- Implement proper list virtualization
- Optimize image loading and caching
- Minimize re-renders
- Efficient state updates
- Proper async operation handling
- Memory management
- Bundle size optimization

### 9. Navigation Structure
When implementing navigation features:
- Use React Navigation 6.x
- Implement type-safe navigation
- Handle deep linking
- Manage navigation state
- Implement proper navigation guards
- Handle navigation events
- Consider navigation animations

### 10. Accessibility Implementation
When implementing accessibility features:
- Use proper ARIA labels
- Implement proper focus management
- Support screen readers
- Provide adequate contrast
- Handle reduced motion preferences
- Support dynamic text sizes
- Implement proper touch targets

### 11. Error Boundaries
- Implement app-wide error boundaries
- Handle component-level errors
- Provide user-friendly error messages
- Log errors appropriately
- Implement recovery mechanisms
- Handle offline scenarios
- Manage API errors

This guide serves as a comprehensive reference for AI assistance during the development of the mental health app. It should be used alongside the context.md file for complete project understanding and implementation guidance.