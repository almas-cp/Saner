import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to home page
  return <Redirect href="/(main)/discover" />;
} 