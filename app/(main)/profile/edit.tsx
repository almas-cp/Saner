import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Avatar, TextInput, Button, ActivityIndicator, Switch, RadioButton, HelperText, IconButton } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

type ProfileData = {
  id: string;
  name: string | null;
  username: string | null;
  profile_pic_url: string | null;
  email: string | null;
  phone_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  is_doctor: boolean | null;
};

export default function EditProfile() {
  const { colors } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      alert(`Error fetching profile: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
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
          console.error('Error uploading image:', error);
          alert(`Error uploading image: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert(`Error picking image: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  };

  const handleSave = async () => {
    if (!profile) {
      console.error("Cannot save: profile is undefined");
      alert('Error: Profile data is missing');
      return;
    }

    setSaving(true);
    try {
      console.log("Saving profile data:", profile);
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          username: profile.username,
          profile_pic_url: profile.profile_pic_url,
          phone_number: profile.phone_number,
          gender: profile.gender,
          date_of_birth: profile.date_of_birth,
          is_doctor: profile.is_doctor,
        })
        .eq('id', profile.id);

      if (error) throw error;
      console.log("Profile updated successfully");
      router.replace('/(main)/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Error updating profile: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(false);
    
    if (profile) {
      setProfile({
        ...profile,
        date_of_birth: format(currentDate, 'yyyy-MM-dd'),
      });
    }
  };

  const handleChange = (field: keyof ProfileData, value: string | boolean) => {
    if (profile) {
      setProfile({
        ...profile,
        [field]: value,
      });
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
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor={colors.TEXT.PRIMARY}
          onPress={() => router.back()}
        />
        <Text variant="headlineSmall" style={{ color: colors.TEXT.PRIMARY }}>
          Edit Profile
        </Text>
        <IconButton
          icon="check"
          size={24}
          iconColor={colors.TAB_BAR.ACTIVE}
          onPress={handleSave}
          disabled={saving}
          loading={saving}
        />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {saving ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.TAB_BAR.ACTIVE} />
              <Text style={{ marginTop: 16, color: colors.TEXT.PRIMARY }}>Saving profile...</Text>
            </View>
          ) : (
            <>
              <Text variant="titleLarge" style={[styles.title, { color: colors.TEXT.PRIMARY }]}>
                Personal Information
              </Text>

              <View style={styles.avatarEdit}>
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
              </View>

              <TextInput
                mode="outlined"
                label="Name"
                value={profile?.name || ''}
                onChangeText={(text) => handleChange('name', text)}
                style={styles.input}
                disabled={saving}
              />

              <TextInput
                mode="outlined"
                label="Username"
                value={profile?.username || ''}
                onChangeText={(text) => handleChange('username', text)}
                style={styles.input}
                disabled={saving}
              />

              <TextInput
                mode="outlined"
                label="Phone Number"
                value={profile?.phone_number || ''}
                onChangeText={(text) => handleChange('phone_number', text)}
                style={styles.input}
                keyboardType="phone-pad"
                disabled={saving}
              />

              <Text style={styles.sectionTitle}>Gender</Text>
              <RadioButton.Group
                onValueChange={(value) => handleChange('gender', value)}
                value={profile?.gender || 'prefer_not_to_say'}
              >
                <View style={styles.radioContainer}>
                  <RadioButton.Item
                    label="Male"
                    value="male"
                    disabled={saving}
                  />
                  <RadioButton.Item
                    label="Female"
                    value="female"
                    disabled={saving}
                  />
                  <RadioButton.Item
                    label="Prefer not to say"
                    value="prefer_not_to_say"
                    disabled={saving}
                  />
                </View>
              </RadioButton.Group>

              <Text style={styles.sectionTitle}>Date of Birth</Text>
              <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                <Text style={{ color: colors.TEXT.PRIMARY }}>
                  {profile.date_of_birth ? format(new Date(profile.date_of_birth), 'MMMM d, yyyy') : 'Select date of birth'}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={profile.date_of_birth ? new Date(profile.date_of_birth) : new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              <View style={styles.switchContainer}>
                <Text style={{ color: colors.TEXT.PRIMARY }}>I am a healthcare professional</Text>
                <Switch
                  value={profile?.is_doctor || false}
                  onValueChange={(value) => handleChange('is_doctor', value)}
                  disabled={saving}
                />
              </View>
              
              {profile.is_doctor && (
                <HelperText type="info">
                  Your profile will be marked as a verified healthcare professional.
                </HelperText>
              )}

              <View style={styles.buttonContainer}>
                <Button 
                  mode="outlined" 
                  onPress={() => router.back()}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginVertical: 16,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  cancelButton: {
    width: '50%',
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  radioContainer: {
    marginBottom: 16,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});