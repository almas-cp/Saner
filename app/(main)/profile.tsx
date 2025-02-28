import { View, StyleSheet, ScrollView, SafeAreaView, Animated, Platform, Pressable, Modal, RefreshControl } from 'react-native';
import { Switch, List, Avatar, Text, IconButton, TextInput, Button, useTheme as usePaperTheme, Card, ActivityIndicator, Surface } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { MotiView } from 'moti';

type ProfileData = {
  id: string;
  name: string | null;
  username: string | null;
  profile_pic_url: string | null;
  email: string | null;
};

const ProfileStats = () => {
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const router = useRouter();
  const paperTheme = usePaperTheme();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get post count
        const { count: posts, error: postsError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (postsError) throw postsError;

        // Get follower count
        const { count: followers, error: followersError } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id);

        if (followersError) throw followersError;

        setPostCount(posts || 0);
        setFollowerCount(followers || 0);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <View style={[styles.statsContainer, { backgroundColor: paperTheme.colors.surface }]}>
      <Pressable 
        style={({ pressed }) => [
          styles.statItem,
          { opacity: pressed ? 0.7 : 1 }
        ]}
        onPress={() => router.push('/(main)/profile/posts')}
      >
        <Text variant="headlineMedium" style={{ color: paperTheme.colors.onSurface, fontWeight: 'bold' }}>
          {postCount}
        </Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          Posts
        </Text>
      </Pressable>
      <View style={[styles.statDivider, { backgroundColor: paperTheme.colors.outline }]} />
      <View style={styles.statItem}>
        <Text variant="headlineMedium" style={{ color: paperTheme.colors.onSurface, fontWeight: 'bold' }}>
          {followerCount}
        </Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          Followers
        </Text>
      </View>
    </View>
  );
};

const SettingsSection = ({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) => {
  const paperTheme = usePaperTheme();
  
  return (
    <List.Section>
      <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
        Settings
      </Text>
      
      <List.Item
        title={<Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurface }}>Dark Mode</Text>}
        description={<Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Toggle dark theme</Text>}
        left={props => (
          <MaterialCommunityIcons
            name={theme === 'dark' ? 'weather-night' : 'weather-sunny'}
            size={24}
            color={paperTheme.colors.onSurface}
            style={props.style}
          />
        )}
        right={() => (
          <Switch
            value={theme === 'dark'}
            onValueChange={toggleTheme}
            color={paperTheme.colors.primary}
          />
        )}
        style={[styles.listItem, { borderBottomColor: paperTheme.colors.outline }]}
      />

      <List.Item
        title={<Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurface }}>Notifications</Text>}
        description={<Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Manage notifications</Text>}
        left={props => (
          <MaterialCommunityIcons
            name="bell-outline"
            size={24}
            color={paperTheme.colors.onSurface}
            style={props.style}
          />
        )}
        right={props => (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={paperTheme.colors.onSurfaceVariant}
            style={props.style}
          />
        )}
        style={[styles.listItem, { borderBottomColor: paperTheme.colors.outline }]}
      />

      <List.Item
        title={<Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurface }}>Privacy</Text>}
        description={<Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Manage your privacy settings</Text>}
        left={props => (
          <MaterialCommunityIcons
            name="shield-outline"
            size={24}
            color={paperTheme.colors.onSurface}
            style={props.style}
          />
        )}
        right={props => (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={paperTheme.colors.onSurfaceVariant}
            style={props.style}
          />
        )}
        style={[styles.listItem, { borderBottomColor: paperTheme.colors.outline }]}
      />
    </List.Section>
  );
};

const AuthModal = ({ visible, onClose, colors }: { visible: boolean; onClose: () => void; colors: any }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paperTheme = usePaperTheme();

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={onClose}
      >
        <Pressable 
          style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text variant="headlineSmall" style={{ color: paperTheme.colors.onSurface }}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <IconButton
              icon="close"
              size={24}
              iconColor={paperTheme.colors.onSurface}
              onPress={onClose}
            />
          </View>

          {error && (
            <Surface style={[styles.errorContainer, { backgroundColor: paperTheme.colors.errorContainer }]}>
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.error }}>
                {error}
              </Text>
            </Surface>
          )}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
            left={<TextInput.Icon icon="lock" />}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
            contentStyle={{ height: 48 }}
          >
            {isSignUp ? 'Sign Up' : 'Login'}
          </Button>

          <Button
            mode="text"
            onPress={() => setIsSignUp(!isSignUp)}
            style={styles.switchButton}
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const EditProfileModal = ({ visible, onClose, profile, onSave }: { 
  visible: boolean; 
  onClose: () => void; 
  profile: ProfileData; 
  onSave: (data: ProfileData) => void;
}) => {
  const paperTheme = usePaperTheme();
  const [editedData, setEditedData] = useState<ProfileData>(profile);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (visible) {
      setEditedData(profile);
    }
  }, [visible, profile]);

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

      if (!result.canceled && result.assets[0].base64) {
        setUploading(true);
        const base64FileData = result.assets[0].base64;
        const filePath = `${profile.id}/${new Date().getTime()}.jpg`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, decode(base64FileData), {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          setEditedData(prev => ({
            ...prev,
            profile_pic_url: publicUrl,
          }));
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
    await onSave(editedData);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalBackdrop]}>
        <View style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ color: paperTheme.colors.onSurface }}>
              Edit Profile
            </Text>
            <IconButton
              icon="close"
              size={24}
              iconColor={paperTheme.colors.onSurface}
              onPress={onClose}
            />
          </View>

          <Pressable onPress={pickImage} style={styles.avatarEdit}>
            <Avatar.Image 
              size={100} 
              source={{ uri: editedData.profile_pic_url || 'https://i.pravatar.cc/300' }} 
            />
            <View style={[styles.avatarEditButton, { backgroundColor: paperTheme.colors.primary }]}>
              {uploading ? (
                <ActivityIndicator size="small" color={paperTheme.colors.surface} />
              ) : (
                <MaterialCommunityIcons name="camera" size={20} color={paperTheme.colors.surface} />
              )}
            </View>
          </Pressable>

          <TextInput
            label="Name"
            value={editedData.name || ''}
            onChangeText={(text) => setEditedData(prev => ({ ...prev, name: text }))}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Username"
            value={editedData.username || ''}
            onChangeText={(text) => setEditedData(prev => ({ ...prev, username: text }))}
            mode="outlined"
            style={styles.input}
          />

          <Button 
            mode="contained" 
            onPress={handleSave}
            style={styles.saveButton}
          >
            Save Changes
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default function Profile() {
  const { theme, toggleTheme } = useTheme();
  const paperTheme = usePaperTheme();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setLoading(false);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, fadeAnim, slideAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  const handleProfileUpdate = async (updatedData: ProfileData) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', profile?.id);

      if (error) throw error;
      setProfile(updatedData);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <ActivityIndicator size="large" color={paperTheme.colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <View style={styles.unauthenticatedContainer}>
          <Text variant="headlineMedium" style={[styles.welcomeText, { color: paperTheme.colors.onBackground }]}>
            Welcome to Saner
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitleText, { color: paperTheme.colors.onSurfaceVariant }]}>
            Sign in or create an account to get started
          </Text>
          
          <View style={styles.authButtonsContainer}>
            <Button
              mode="contained"
              onPress={() => setAuthModalVisible(true)}
              style={styles.authButton}
            >
              Login
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => router.push('/(auth)/signup')}
              style={styles.authButton}
            >
              Sign Up
            </Button>
          </View>
        </View>

        <AuthModal
          visible={authModalVisible}
          onClose={() => {
            setAuthModalVisible(false);
            fetchProfile();
          }}
          colors={paperTheme.colors}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={paperTheme.colors.primary}
          />
        }
      >
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.headerTop}>
            <View style={{ width: 40 }} />
            <Text variant="titleLarge" style={{ color: paperTheme.colors.onBackground }}>
              Profile
            </Text>
            <IconButton
              icon="pencil"
              size={24}
              iconColor={paperTheme.colors.primary}
              onPress={() => setEditModalVisible(true)}
              style={styles.editButton}
            />
          </View>

          <Avatar.Image 
            size={80} 
            source={{ uri: profile.profile_pic_url || 'https://i.pravatar.cc/300' }} 
            style={styles.avatar}
          />
          <Text variant="headlineMedium" style={{ color: paperTheme.colors.onBackground }}>
            {profile.name || 'Anonymous'}
          </Text>
          <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
            @{profile.username || 'username'}
          </Text>
          {profile.email && (
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
              {profile.email}
            </Text>
          )}
        </Animated.View>

        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
        >
          <ProfileStats />
        </MotiView>
        
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 400 }}
        >
          <SettingsSection theme={theme} toggleTheme={toggleTheme} />
          
          <List.Item
            title={<Text variant="bodyLarge" style={{ color: paperTheme.colors.onBackground }}>Sign Out</Text>}
            description={<Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Log out of your account</Text>}
            left={props => (
              <MaterialCommunityIcons
                name="logout"
                size={24}
                color={paperTheme.colors.onBackground}
                style={props.style}
              />
            )}
            onPress={handleSignOut}
            style={[styles.listItem, { borderBottomColor: paperTheme.colors.outline }]}
          />
        </MotiView>
      </ScrollView>

      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        profile={profile}
        onSave={handleProfileUpdate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  editButton: {
    margin: 0,
  },
  avatar: {
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 24,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  listItem: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarEdit: {
    alignSelf: 'center',
    marginBottom: 20,
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
  submitButton: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  switchButton: {
    marginTop: 8,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    textAlign: 'center',
    marginBottom: 32,
  },
  authButtonsContainer: {
    width: '100%',
    gap: 16,
  },
  authButton: {
    width: '100%',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
  },
}); 