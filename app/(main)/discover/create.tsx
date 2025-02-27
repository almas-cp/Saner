import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useTheme } from '../../../src/contexts/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

export default function CreatePost() {
  const { colors } = useTheme();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploading(true);
        const base64FileData = result.assets[0].base64;

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const filePath = `${user.id}/${new Date().getTime()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(filePath, decode(base64FileData), {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(filePath);

          setImageUrl(publicUrl);
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Error uploading image');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error picking image');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('posts')
        .insert({
          title: title.trim(),
          content: content.trim(),
          image_url: imageUrl,
          user_id: user.id,
        });

      if (error) throw error;
      router.replace('/(main)/discover');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TextInput
          label="Title"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
        />

        <Pressable 
          onPress={pickImage} 
          style={[
            styles.imageUpload,
            { 
              backgroundColor: colors.SURFACE,
              borderColor: colors.BORDER,
            }
          ]}
        >
          {imageUrl ? (
            <View style={styles.imagePreview}>
              <MaterialCommunityIcons 
                name="image" 
                size={24} 
                color={colors.TEXT.PRIMARY} 
              />
              <Text style={{ color: colors.TEXT.PRIMARY }}>
                Image uploaded
              </Text>
            </View>
          ) : (
            <View style={styles.uploadPrompt}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.TAB_BAR.ACTIVE} />
              ) : (
                <>
                  <MaterialCommunityIcons 
                    name="image-plus" 
                    size={24} 
                    color={colors.TEXT.SECONDARY} 
                  />
                  <Text style={{ color: colors.TEXT.SECONDARY }}>
                    Add cover image
                  </Text>
                </>
              )}
            </View>
          )}
        </Pressable>

        <TextInput
          label="Content"
          value={content}
          onChangeText={setContent}
          mode="outlined"
          multiline
          numberOfLines={8}
          style={styles.input}
        />
      </ScrollView>

      <View style={[styles.footer, { 
        borderTopColor: colors.BORDER,
        backgroundColor: colors.BACKGROUND
      }]}>
        <Button 
          mode="outlined" 
          onPress={() => router.back()}
          style={[styles.button, { borderColor: colors.BORDER }]}
          textColor={colors.TEXT.PRIMARY}
        >
          Cancel
        </Button>
        <Button 
          mode="contained" 
          onPress={handleSubmit}
          style={[styles.button, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
          loading={saving}
          disabled={saving}
        >
          Publish
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
    marginHorizontal: 16,
  },
  imageUpload: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  imagePreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 65,
    left: 0,
    right: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 1,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    minHeight: 45,
  },
}); 