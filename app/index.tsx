import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the main app by default
  return <Redirect href="/(main)" />;
}
