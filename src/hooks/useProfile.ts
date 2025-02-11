import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth';
import { Database } from '../types/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  async function fetchProfile() {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const username = session!.user.email?.split('@')[0] || `user${session!.user.id.slice(0, 8)}`;
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: session!.user.id,
              email: session!.user.email,
              username: username,
              name: username,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          data = newProfile;
        } else {
          throw error;
        }
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(updates: Partial<Profile>) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session!.user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      await fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async function uploadProfilePic(uri: string) {
    try {
      // Delete old profile pic if exists
      if (profile?.profile_pic_url) {
        const oldPath = profile.profile_pic_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-pics')
            .remove([`${session!.user.id}/profile/${oldPath}`]);
        }
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'profile-pic.jpg',
        type: 'image/jpeg',
      } as any);

      // Generate unique file path
      const filePath = `${session!.user.id}/profile/${Date.now()}.jpg`;

      // Upload using Supabase client
      const { error: uploadError } = await supabase.storage
        .from('profile-pics')
        .upload(filePath, formData, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pics')
        .getPublicUrl(filePath);

      // Update profile with new image URL
      await updateProfile({ profile_pic_url: publicUrl });

    } catch (error) {
      console.error('Error uploading profile pic:', error);
      throw error;
    }
  }

  async function handleImagePick() {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access camera roll is required!');
      }

      // Launch image picker with correct type
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'image',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePic(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }

  return {
    profile,
    loading,
    updateProfile,
    handleImagePick,
  };
}