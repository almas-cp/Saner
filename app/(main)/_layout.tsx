import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getNavigationTheme } from '../../src/styles/theme';
import { MainTabParamList } from '../../src/types/navigation';
import { useTheme } from '../../src/contexts/theme';
import { View, Animated, Pressable, StyleSheet, Dimensions, Switch } from 'react-native';
import { Avatar, Text, IconButton, Button } from 'react-native-paper';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';

const TAB_ICONS = {
  discover: 'compass',
  breath: 'weather-windy',
  write: 'pencil',
  chat: 'chat',
  'wall-e': 'robot',
  profile: 'account',
} as const;

type ProfileData = {
  id: string;
  name: string | null;
  username: string | null;
  profile_pic_url: string | null;
};

export default function MainLayout() {
  const { theme, colors, toggleTheme } = useTheme();
  const navigationTheme = getNavigationTheme(theme);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
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
      setProfile(null);
    }
  };

  useEffect(() => {
    fetchProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });
    return () => subscription.unsubscribe();
  }, []);

  const toggleMenu = () => {
    const toValue = isMenuOpen ? Dimensions.get('window').width : 0;
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
      toggleMenu();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.BACKGROUND }}>
      <Tabs
        screenOptions={{
          ...navigationTheme.screenOptions,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton
                icon="magnify"
                size={24}
                iconColor={colors.TAB_BAR.ACTIVE}
                onPress={() => router.push('/(main)/search')}
                style={{ marginRight: 4 }}
              />
              {profile?.profile_pic_url ? (
                <Pressable
                  onPress={toggleMenu}
                  style={({ pressed }) => ({
                    marginRight: 16,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  })}
                >
                  <Avatar.Image
                    size={32}
                    source={{ uri: profile.profile_pic_url }}
                  />
                </Pressable>
              ) : (
                <IconButton
                  icon="account-circle-outline"
                  size={28}
                  iconColor={colors.TAB_BAR.ACTIVE}
                  onPress={toggleMenu}
                  style={{ marginRight: 8 }}
                />
              )}
            </View>
          ),
        }}>
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={TAB_ICONS.discover} size={size + 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="breath"
          options={{
            title: 'Breath',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={TAB_ICONS.breath} size={size + 2} color={color} />
            ),
            headerShown: false
          }}
        />
        <Tabs.Screen
          name="write"
          options={{
            title: 'Write',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={TAB_ICONS.write} size={size + 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={TAB_ICONS.chat} size={size + 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="wall-e"
          options={{
            title: 'Wall-E',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={TAB_ICONS['wall-e']} size={size + 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile/edit"
          options={{
            href: null,
            headerShown: true,
            title: 'Edit Profile',
          }}
        />
        <Tabs.Screen
          name="profile/posts"
          options={{
            href: null,
            headerShown: true,
            title: 'My Posts',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null,
            title: 'Profile',
          }}
        />
        <Tabs.Screen
          name="discover/create"
          options={{
            href: null,
            headerShown: true,
            title: 'Create Post',
          }}
        />
        <Tabs.Screen
          name="discover/[id]"
          options={{
            href: null,
            headerShown: true,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            href: null,
            headerShown: true,
            title: 'Search',
          }}
        />
      </Tabs>

      {isMenuOpen && (
        <Pressable
          style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
          onPress={toggleMenu}
        />
      )}

      <Animated.View
        style={[
          styles.menu,
          {
            backgroundColor: colors.SURFACE,
            transform: [{ translateX: slideAnim }],
          },
        ]}>
        <View style={styles.menuContent}>
          {profile ? (
            <>
              <View style={styles.profileSection}>
                <Avatar.Image
                  size={80}
                  source={{ uri: profile.profile_pic_url || 'https://i.pravatar.cc/300' }}
                />
                <Text
                  variant="titleLarge"
                  style={[styles.name, { color: colors.TEXT.PRIMARY }]}
                >
                  {profile.name || 'Anonymous'}
                </Text>
                <Text
                  variant="bodyLarge"
                  style={[styles.username, { color: colors.TEXT.SECONDARY }]}
                >
                  @{profile.username || 'username'}
                </Text>
              </View>

              <View style={styles.actions}>
                <Button
                  mode="outlined"
                  icon="account"
                  onPress={() => {
                    toggleMenu();
                    router.push('/(main)/profile');
                  }}
                  style={styles.actionButton}
                >
                  Go to Profile
                </Button>
                <Button
                  mode="outlined"
                  icon="post"
                  onPress={() => {
                    toggleMenu();
                    router.push('/(main)/profile/posts');
                  }}
                  style={styles.actionButton}
                >
                  My Posts
                </Button>
                <View style={[styles.themeToggle, { backgroundColor: colors.SURFACE }]}>
                  <View style={styles.themeToggleContent}>
                    <MaterialCommunityIcons
                      name={theme === 'dark' ? 'weather-night' : 'weather-sunny'}
                      size={24}
                      color={colors.TEXT.PRIMARY}
                    />
                    <Text variant="bodyLarge" style={{ color: colors.TEXT.PRIMARY, flex: 1, marginLeft: 12 }}>
                      Dark Mode
                    </Text>
                    <Switch
                      value={theme === 'dark'}
                      onValueChange={toggleTheme}
                      trackColor={{ false: '#767577', true: colors.TAB_BAR.ACTIVE }}
                      thumbColor={theme === 'dark' ? colors.TAB_BAR.ACTIVE : '#f4f3f4'}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.footer}>
                <Button
                  mode="contained"
                  icon="logout"
                  onPress={handleSignOut}
                  style={[styles.signOutButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
                >
                  Sign Out
                </Button>
              </View>
            </>
          ) : (
            <>
              <View style={styles.profileSection}>
                <Avatar.Icon
                  size={80}
                  icon="account-circle"
                  style={{ backgroundColor: colors.TAB_BAR.ACTIVE }}
                />
                <Text
                  variant="titleLarge"
                  style={[styles.name, { color: colors.TEXT.PRIMARY }]}
                >
                  Welcome to Saner
                </Text>
                <Text
                  variant="bodyLarge"
                  style={[styles.username, { color: colors.TEXT.SECONDARY, textAlign: 'center' }]}
                >
                  Sign in to access all features
                </Text>
              </View>

              <View style={styles.actions}>
                <View style={[styles.themeToggle, { backgroundColor: colors.SURFACE }]}>
                  <View style={styles.themeToggleContent}>
                    <MaterialCommunityIcons
                      name={theme === 'dark' ? 'weather-night' : 'weather-sunny'}
                      size={24}
                      color={colors.TEXT.PRIMARY}
                    />
                    <Text variant="bodyLarge" style={{ color: colors.TEXT.PRIMARY, flex: 1, marginLeft: 12 }}>
                      Dark Mode
                    </Text>
                    <Switch
                      value={theme === 'dark'}
                      onValueChange={toggleTheme}
                      trackColor={{ false: '#767577', true: colors.TAB_BAR.ACTIVE }}
                      thumbColor={theme === 'dark' ? colors.TAB_BAR.ACTIVE : '#f4f3f4'}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.footer}>
                <Button
                  mode="contained"
                  icon="login"
                  onPress={() => {
                    toggleMenu();
                    router.push('/(main)/profile');
                  }}
                  style={[styles.signInButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
                >
                  Sign In
                </Button>
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  menu: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 400,
    zIndex: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  menuContent: {
    flex: 1,
    padding: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  name: {
    marginTop: 16,
    marginBottom: 4,
  },
  username: {
    marginBottom: 16,
  },
  actions: {
    flex: 1,
  },
  actionButton: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 'auto',
  },
  signOutButton: {
    marginTop: 16,
  },
  signInButton: {
    marginTop: 16,
  },
  themeToggle: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
}); 