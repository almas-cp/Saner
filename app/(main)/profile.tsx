import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Avatar } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useAuth } from '../../src/contexts/auth';
import { useProfile } from '../../src/hooks/useProfile';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Profile() {
  const { signOut, session } = useAuth();
  const { profile, loading, updateProfile, handleImagePick } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        username: profile.username || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isEditing ? (
          <Button mode="text" onPress={handleSave}>
            Save
          </Button>
        ) : (
          <Button mode="text" onPress={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </View>

      <View style={styles.profileSection}>
        {profile?.profile_pic_url ? (
          <Avatar.Image
            size={100}
            source={{ uri: profile.profile_pic_url }}
          />
        ) : (
          <Avatar.Icon 
            size={100} 
            icon={props => <MaterialCommunityIcons name="account" {...props} />} 
          />
        )}
        {isEditing && (
          <Button 
            mode="text" 
            onPress={handleImagePick}
            style={{ marginTop: 8 }}
          >
            Change Photo
          </Button>
        )}
      </View>

      <View style={styles.infoSection}>
        {isEditing ? (
          <>
            <TextInput
              label="Name"
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              style={styles.input}
            />
            <TextInput
              label="Username"
              value={formData.username}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, username: text }))
              }
              style={styles.input}
            />
          </>
        ) : (
          <>
            <Text variant="headlineMedium" style={styles.name}>
              {profile?.name}
            </Text>
            <Text variant="bodyLarge" style={styles.username}>
              {profile?.username}
            </Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={signOut}
          style={styles.logoutButton}
          textColor="white"
        >
          Logout
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    marginBottom: 8,
  },
  username: {
    color: '#666',
  },
  input: {
    width: '100%',
    marginBottom: 16,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 