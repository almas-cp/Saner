import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/auth';
import { supabase } from '../../src/lib/supabase';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleLogin = async () => {
    try {
      setError('');
      setLoading(true);

      // Check if the identifier is an email or username
      const isEmail = identifier.includes('@');
      
      let email = identifier;
      
      // If it's a username, get the corresponding email
      if (!isEmail) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier)
          .single();

        if (userError || !userData) {
          throw new Error('Invalid username or password');
        }

        email = userData.email;
      }

      await signIn(email, password);

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Login</Text>
      
      <TextInput
        label="Email or Username"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        style={styles.input}
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {error ? <HelperText type="error" visible={true}>{error}</HelperText> : null}

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        style={styles.button}
      >
        Login
      </Button>

      <Link href="/signup" asChild>
        <Button mode="text">Don't have an account? Sign up</Button>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  }
}); 