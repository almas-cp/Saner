import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect directly to discover page
  return <Redirect href="/(main)/discover" />;
}
