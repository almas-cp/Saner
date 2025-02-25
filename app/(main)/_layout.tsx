import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getNavigationTheme } from '../../src/styles/theme';
import { MainTabParamList } from '../../src/types/navigation';
import { useTheme } from '../../src/contexts/theme';
import React from 'react';
import { View, Animated, Pressable, StyleSheet, Dimensions, Switch, Platform, ScrollView } from 'react-native';
import { Avatar, Text, IconButton, Button, Divider, RadioButton, Menu } from 'react-native-paper';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';

const TAB_ICONS = {
  breath: 'weather-windy',
  discover: 'compass',
  write: 'pencil',
  chat: 'chat',
  profile: 'account-circle-outline',
} as const;

const CustomTabBar = ({ state, descriptors, navigation, colors }: any) => {
  // Filter only the main tabs we want to show
  const mainTabs = ['discover', 'breath', 'write', 'chat', 'profile'];
  const visibleRoutes = state.routes.filter((route: any) => mainTabs.includes(route.name));

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.SURFACE,
      height: Platform.OS === 'ios' ? 90 : 65,
      paddingBottom: Platform.OS === 'ios' ? 20 : 0,
      borderTopWidth: 0.5,
      borderTopColor: colors.BORDER,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      elevation: 0,
      shadowColor: 'transparent',
    }}>
      {visibleRoutes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const routeIndex = state.routes.findIndex(r => r.key === route.key);
        const isFocused = state.index === routeIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 45,
              position: 'relative',
            }}
            android_ripple={{ 
              color: colors.BORDER,
              borderless: true,
              radius: 28
            }}
          >
            <Animated.View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: isFocused ? 1.15 : 1 }],
              }}
            >
              <MaterialCommunityIcons
                name={TAB_ICONS[route.name as keyof typeof TAB_ICONS]}
                size={22}
                color={isFocused ? colors.TAB_BAR.ACTIVE : colors.TAB_BAR.INACTIVE}
                style={{
                  marginBottom: 4,
                  opacity: isFocused ? 1 : 0.8
                }}
              />
              <Text
                style={{
                  color: isFocused ? colors.TAB_BAR.ACTIVE : colors.TAB_BAR.INACTIVE,
                  fontSize: 11,
                  fontWeight: isFocused ? '600' : '400',
                  opacity: isFocused ? 1 : 0.8,
                  letterSpacing: 0.3,
                }}
              >
                {label}
              </Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
};

type ProfileData = {
  id: string;
  name: string | null;
  username: string | null;
  profile_pic_url: string | null;
};

export default function MainLayout() {
  const { theme, colors, toggleTheme, colorPalette, setColorPalette } = useTheme();
  const navigationTheme = getNavigationTheme(theme);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const router = useRouter();
  const [paletteMenuVisible, setPaletteMenuVisible] = useState(false);

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

  const handlePaletteChange = (palette: 'default' | 'citric' | 'mint' | 'berry' | 'ocean') => {
    setColorPalette(palette);
    setPaletteMenuVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.BACKGROUND }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} colors={colors} />}
        screenOptions={{
          headerTitle: "",
          headerStyle: {
            backgroundColor: colors.SURFACE,
          },
          headerShadowVisible: false,
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
        }}
      >
        <Tabs.Screen
          name="discover"
          options={{
            headerShown: true
          }}
        />
        <Tabs.Screen
          name="breath"
          options={{
            headerShown: true
          }}
        />
        <Tabs.Screen
          name="write"
          options={{
            headerShown: true
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            headerShown: true
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            headerShown: true
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="wall-e"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="profile/edit"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="profile/posts"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="discover/create"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="discover/[id]"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="chat/[id]"
          options={{
            href: null
          }}
        />
        <Tabs.Screen
          name="profile/[id]"
          options={{
            href: null
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
            backgroundColor: colors.BACKGROUND,
            transform: [{ translateX: slideAnim }] 
          },
        ]}
      >
        <ScrollView 
          style={styles.menuContent}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.themeContainer, { backgroundColor: colors.SURFACE, marginTop: 16 }]}>
            <Text variant="titleMedium" style={{ color: colors.TEXT.PRIMARY, marginBottom: 12 }}>
              Appearance
            </Text>
            
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
            
            <Divider style={{ marginVertical: 12 }} />
            
            <Text variant="bodyLarge" style={{ color: colors.TEXT.PRIMARY, marginBottom: 8 }}>
              Color Palette
            </Text>
            
            <Menu
              visible={paletteMenuVisible}
              onDismiss={() => setPaletteMenuVisible(false)}
              anchor={
                <Pressable
                  onPress={() => setPaletteMenuVisible(true)}
                  style={[styles.dropdownButton, { borderColor: colors.BORDER }]}
                >
                  <View style={styles.colorPreview}>
                    <View style={[
                      styles.colorSwatch, 
                      { 
                        backgroundColor: 
                          colorPalette === 'default' ? '#6B4DE6' :
                          colorPalette === 'citric' ? '#FFB347' :
                          colorPalette === 'mint' ? '#4AD66D' :
                          colorPalette === 'berry' ? '#FF6B6B' :
                          '#2E86DE' // ocean
                      }
                    ]} />
                  </View>
                  <Text style={{ flex: 1, color: colors.TEXT.PRIMARY }}>
                    {colorPalette.charAt(0).toUpperCase() + colorPalette.slice(1)}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={24} color={colors.TEXT.SECONDARY} />
                </Pressable>
              }
            >
              <Menu.Item 
                onPress={() => handlePaletteChange('default')} 
                title="Default" 
                leadingIcon={() => (
                  <View style={[styles.colorSwatch, { backgroundColor: '#6B4DE6', width: 20, height: 20, borderRadius: 10 }]} />
                )}
              />
              <Menu.Item 
                onPress={() => handlePaletteChange('citric')} 
                title="Citric" 
                leadingIcon={() => (
                  <View style={[styles.colorSwatch, { backgroundColor: '#FFB347', width: 20, height: 20, borderRadius: 10 }]} />
                )}
              />
              <Menu.Item 
                onPress={() => handlePaletteChange('mint')} 
                title="Mint" 
                leadingIcon={() => (
                  <View style={[styles.colorSwatch, { backgroundColor: '#4AD66D', width: 20, height: 20, borderRadius: 10 }]} />
                )}
              />
              <Menu.Item 
                onPress={() => handlePaletteChange('berry')} 
                title="Berry" 
                leadingIcon={() => (
                  <View style={[styles.colorSwatch, { backgroundColor: '#FF6B6B', width: 20, height: 20, borderRadius: 10 }]} />
                )}
              />
              <Menu.Item 
                onPress={() => handlePaletteChange('ocean')} 
                title="Ocean" 
                leadingIcon={() => (
                  <View style={[styles.colorSwatch, { backgroundColor: '#2E86DE', width: 20, height: 20, borderRadius: 10 }]} />
                )}
              />
            </Menu>
          </View>

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
        </ScrollView>
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
  themeContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  themeToggle: {
    borderRadius: 12,
    marginBottom: 4,
    overflow: 'hidden',
  },
  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
}); 