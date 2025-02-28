import { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, RadioButton, Portal, Modal, IconButton } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/contexts/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../src/lib/supabase';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    username: '',
    phoneNumber: '+91',
    gender: 'male',
    dateOfBirth: new Date(),
    isDoctor: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { signUp } = useAuth();

  const validateForm = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.username || !formData.phoneNumber) {
      setError('All fields are required');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    // Check for existing email
    const { data: emailExists } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', formData.email)
      .single();

    if (emailExists) {
      setError('Email already exists');
      return false;
    }

    // Check for existing username
    const { data: usernameExists } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', formData.username)
      .single();

    if (usernameExists) {
      setError('Username already exists');
      return false;
    }

    // Check for existing phone number
    const { data: phoneExists } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('phone_number', formData.phoneNumber)
      .single();

    if (phoneExists) {
      setError('Phone number already exists');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    try {
      setError('');
      setLoading(true);

      const isValid = await validateForm();
      if (!isValid) {
        setLoading(false);
        return;
      }

      await signUp(formData.email, formData.password);

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          name: formData.name,
          email: formData.email,
          username: formData.username,
          phone_number: formData.phoneNumber,
          gender: formData.gender,
          date_of_birth: formData.dateOfBirth.toISOString().split('T')[0],
          is_doctor: formData.isDoctor
        });

      if (profileError) throw profileError;

      router.replace('/login');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => ({ ...prev, dateOfBirth: selectedDate }));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>Sign Up</Text>
        
        <TextInput
          label="Name"
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          style={styles.input}
        />

        <TextInput
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <TextInput
          label="Username"
          value={formData.username}
          onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
          autoCapitalize="none"
          style={styles.input}
        />
        
        <TextInput
          label="Password"
          value={formData.password}
          onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
          secureTextEntry
          style={styles.input}
        />

        <TextInput
          label="Phone Number"
          value={formData.phoneNumber}
          onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text>Gender</Text>
        <RadioButton.Group
          onValueChange={value => setFormData(prev => ({ ...prev, gender: value }))}
          value={formData.gender}
        >
          <View style={styles.radioGroup}>
            <View style={styles.radioButton}>
              <RadioButton value="male" />
              <Text>Male</Text>
            </View>
            <View style={styles.radioButton}>
              <RadioButton value="female" />
              <Text>Female</Text>
            </View>
          </View>
        </RadioButton.Group>

        <Button
          mode="outlined"
          onPress={() => setShowDatePicker(true)}
          style={styles.input}
        >
          Date of Birth: {formData.dateOfBirth.toLocaleDateString()}
        </Button>

        {(showDatePicker || Platform.OS === 'ios') && (
          <DateTimePicker
            value={formData.dateOfBirth}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            style={Platform.OS === 'ios' ? styles.datePicker : undefined}
          />
        )}

        <View style={styles.doctorOption}>
          <Text>Are you a doctor?</Text>
          <RadioButton.Group
            onValueChange={value => setFormData(prev => ({ ...prev, isDoctor: value === 'yes' }))}
            value={formData.isDoctor ? 'yes' : 'no'}
          >
            <View style={styles.radioGroup}>
              <View style={styles.radioButton}>
                <RadioButton value="yes" />
                <Text>Yes</Text>
              </View>
              <View style={styles.radioButton}>
                <RadioButton value="no" />
                <Text>No</Text>
              </View>
            </View>
          </RadioButton.Group>
        </View>

        {error ? <HelperText type="error" visible={true}>{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleSignup}
          loading={loading}
          style={styles.button}
        >
          Sign Up
        </Button>

        <Link href="/login" asChild>
          <Button mode="text">Already have an account? Login</Button>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
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
  },
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  doctorOption: {
    marginBottom: 16,
  },
  datePicker: {
    width: '100%',
    marginBottom: 16,
  },
}); 