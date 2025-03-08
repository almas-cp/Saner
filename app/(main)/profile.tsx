import { View, StyleSheet, ScrollView, SafeAreaView, Animated, Platform, Pressable, Modal, RefreshControl } from 'react-native';
import { Switch, List, Avatar, Text, IconButton, TextInput, Button, useTheme as usePaperTheme, Card, ActivityIndicator, Surface, Chip, RadioButton, HelperText } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { MotiView } from 'moti';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

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
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
          <View style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
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
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default function Profile() {
  const { theme, toggleTheme } = useTheme();
  const paperTheme = usePaperTheme();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
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
      console.log("Updating profile with data:", updatedData);
      if (!profile || !profile.id) {
        console.error("No profile or profile ID to update");
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', profile.id);

      if (error) throw error;
      console.log("Profile updated successfully");
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

  const formattedDateOfBirth = profile.date_of_birth 
    ? new Date(profile.date_of_birth).toLocaleDateString() 
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
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
              onPress={() => {
                console.log("Edit button pressed - navigating to edit page");
                router.push('/(main)/profile/edit');
              }}
              style={styles.editButton}
            />
          </View>

          <Avatar.Image 
            size={80} 
            source={{ uri: profile.profile_pic_url || 'https://i.pravatar.cc/300' }} 
            style={styles.avatar}
          />
          <View style={styles.nameContainer}>
            <Text variant="headlineMedium" style={{ color: paperTheme.colors.onBackground }}>
              {profile.name || 'Anonymous'}
            </Text>
            {profile.is_doctor && (
              <MaterialCommunityIcons name="check-decagram" size={24} color="#1DA1F2" style={{ marginLeft: 8 }} />
            )}
          </View>
          <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
            @{profile.username || 'username'}
          </Text>
          {profile.email && (
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
              {profile.email}
            </Text>
          )}
          {formattedDateOfBirth && (
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
              Born: {formattedDateOfBirth}
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 12,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
});