import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Avatar, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

type ProfileData = {
  id: string;
  name: string | null;
  username: string | null;
  profile_pic_url: string | null;
  email: string | null;
};

export default function EditProfile() {
  const { colors } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/(main)/profile');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      router.replace('/(main)/profile');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64 && profile) {
        setUploading(true);
        const base64FileData = result.assets[0].base64;
        const filePath = `${profile.id}/${new Date().getTime()}.jpg`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('profile-pics')
            .upload(filePath, decode(base64FileData), {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('profile-pics')
            .getPublicUrl(filePath);

          const { error: updateError } = await supabase
            .from('profiles')
            .update({ profile_pic_url: publicUrl })
            .eq('id', profile.id);

          if (updateError) throw updateError;

          setProfile(prev => prev ? ({
            ...prev,
            profile_pic_url: publicUrl,
          }) : null);
        } catch (error) {
          alert('Error uploading image');
          console.error('Error uploading image:', error);
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      alert('Error picking image');
      console.error('Error picking image:', error);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          username: profile.username,
          profile_pic_url: profile.profile_pic_url,
        })
        .eq('id', profile.id);

      if (error) throw error;
      router.replace('/(main)/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    }
  };

  if (loading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
        <ActivityIndicator size="large" color={colors.TAB_BAR.ACTIVE} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <View style={styles.content}>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.TEXT.PRIMARY }]}>
          Edit Profile
        </Text>

        <Pressable onPress={pickImage} style={styles.avatarEdit}>
          <Avatar.Image 
            size={120} 
            source={{ uri: profile.profile_pic_url || 'https://i.pravatar.cc/300' }} 
          />
          <View style={[styles.avatarEditButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.BACKGROUND} />
            ) : (
              <MaterialCommunityIcons name="camera" size={20} color={colors.BACKGROUND} />
            )}
          </View>
        </Pressable>

        <TextInput
          label="Name"
          value={profile.name || ''}
          onChangeText={(text) => setProfile(prev => prev ? ({ ...prev, name: text }) : null)}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Username"
          value={profile.username || ''}
          onChangeText={(text) => setProfile(prev => prev ? ({ ...prev, username: text }) : null)}
          mode="outlined"
          style={styles.input}
        />

        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={() => router.back()}
            style={styles.button}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSave}
            style={[styles.button, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
          >
            Save Changes
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  avatarEdit: {
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
  },
}); 