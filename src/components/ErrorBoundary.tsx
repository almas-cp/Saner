import React from 'react';
import { Text } from 'react-native-paper';

export class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
}> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <Text>Something went wrong with this component</Text>;
    }
    return this.props.children;
  }
}
