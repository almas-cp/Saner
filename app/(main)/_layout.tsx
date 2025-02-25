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
import { useRouter, usePathname } from 'expo-router';
import * as Font from 'expo-font';
import { useFonts } from 'expo-font';

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

  // Function to check if user is authenticated
  const checkAuthAndNavigate = async (routeName: string) => {
    if (routeName === 'chat') {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // If not authenticated, redirect to profile page
        navigation.navigate('profile');
        return false;
      }
    }
    return true;
  };

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
      // Add subtle shadow for iOS
      ...(Platform.OS === 'ios' ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      } : {}),
    }}>
      {visibleRoutes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const routeIndex = state.routes.findIndex(r => r.key === route.key);
        const isFocused = state.index === routeIndex;

        const onPress = async () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            // Check authentication for chat tab
            const canNavigate = await checkAuthAndNavigate(route.name);
            if (canNavigate) {
              navigation.navigate(route.name);
            }
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
                position: 'relative',
                transform: [{ 
                  scale: isFocused ? 1.15 : 1 
                }],
              }}
            >
              {isFocused && (
                <Animated.View 
                  style={{
                    position: 'absolute',
                    top: -4,
                    left: -9,
                    right: -9,
                    bottom: -4,
                    backgroundColor: colors.TAB_BAR.ACTIVE + '15', // Add transparency
                    borderRadius: 12,
                    zIndex: -1,
                  }}
                />
              )}
              <MaterialCommunityIcons
                name={TAB_ICONS[route.name as keyof typeof TAB_ICONS]}
                size={24}
                color={isFocused ? colors.TAB_BAR.ACTIVE : colors.TAB_BAR.INACTIVE}
                style={{
                  marginBottom: 3,
                  opacity: isFocused ? 1 : 0.7,
                }}
              />
              <Text
                style={{
                  color: isFocused ? colors.TAB_BAR.ACTIVE : colors.TAB_BAR.INACTIVE,
                  fontSize: 11,
                  fontWeight: isFocused ? '600' : '400',
                  opacity: isFocused ? 1 : 0.7,
                  letterSpacing: 0.3,
                }}
              >
                {label}
              </Text>
              {isFocused && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.TAB_BAR.ACTIVE,
                    elevation: 2,
                  }}
                />
              )}
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
  const { theme, colors, toggleTheme, palette, setColorPalette } = useTheme();
  const navigationTheme = getNavigationTheme(theme);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const router = useRouter();
  const pathname = usePathname();
  const [paletteMenuVisible, setPaletteMenuVisible] = useState(false);
  
  // Load custom fonts
  const [fontsLoaded] = useFonts({
    'Saner-Bold': require('../../assets/fonts/Montserrat-Bold.ttf'),
  });
  
  // Check if we're on a chat detail page (chat/[id]) or Wall-E chat
  const isOnChatDetail = pathname.match(/\/chat\/[^\/]+$/) || pathname.includes('/wall-e');

  // Check if we're on the main chat page
  const isOnChatPage = pathname === '/chat';

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

  // Redirect unauthorized users from chat page
  useEffect(() => {
    if (isOnChatPage || isOnChatDetail) {
      const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/(main)/profile');
        }
      };
      
      checkAuth();
    }
  }, [pathname, router]);

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
    setIsMenuOpen(false);
  };

  // Inside the MainLayout component, add this helper function
  const formatPaletteName = (paletteName: string | undefined): string => {
    if (!paletteName) return 'Default';
    return paletteName.charAt(0).toUpperCase() + paletteName.slice(1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.BACKGROUND }}>
      <Tabs
        tabBar={(props) => isOnChatDetail ? null : <CustomTabBar {...props} colors={colors} />}
        screenOptions={{
          headerTitle: () => (
            <Text 
              style={{ 
                fontFamily: fontsLoaded ? 'Saner-Bold' : undefined,
                fontSize: 24, 
                fontWeight: 'bold',
                color: colors.TAB_BAR.ACTIVE,
                letterSpacing: 0.8,
                marginLeft: 4,
                textShadowColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              Saner
            </Text>
          ),
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
          style={[styles.backdrop, { 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }]}
          onPress={toggleMenu}
        />
      )}

      <Animated.View
        style={[
          styles.menu,
          { 
            backgroundColor: colors.BACKGROUND,
            transform: [{ translateX: slideAnim }],
            borderTopLeftRadius: Platform.OS === 'ios' ? 20 : 0,
            borderBottomLeftRadius: Platform.OS === 'ios' ? 20 : 0,
          },
        ]}
      >
        <ScrollView 
          style={styles.menuContent}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.themeContainer, { 
            backgroundColor: colors.SURFACE, 
            marginTop: 16,
            borderRadius: 16,
            elevation: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
          }]}>
            <Text variant="titleMedium" style={{ 
              color: colors.TEXT.PRIMARY, 
              marginBottom: 12,
              fontWeight: '600',
             }}>
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
            
            <Divider style={{ marginVertical: 12, opacity: 0.6 }} />
            
            <Text variant="bodyLarge" style={{ color: colors.TEXT.PRIMARY, marginBottom: 8, fontWeight: '500' }}>
              Color Palette
            </Text>
            
            <Menu
              visible={paletteMenuVisible}
              onDismiss={() => setPaletteMenuVisible(false)}
              anchor={
                <Pressable
                  onPress={() => setPaletteMenuVisible(true)}
                  style={[styles.dropdownButton, { 
                    borderColor: colors.BORDER,
                    backgroundColor: colors.BACKGROUND,
                    borderRadius: 12,
                  }]}
                >
                  <View style={styles.colorPreview}>
                    <View style={[
                      styles.colorSwatch, 
                      { 
                        backgroundColor: 
                          palette === 'default' ? '#6B4DE6' :
                          palette === 'citric' ? '#FFB347' :
                          palette === 'mint' ? '#4AD66D' :
                          palette === 'berry' ? '#FF6B6B' :
                          '#2E86DE', // ocean
                        borderWidth: 2,
                        borderColor: colors.BACKGROUND,
                        elevation: 2,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1.5,
                      }
                    ]} />
                  </View>
                  <Text style={{ 
                    flex: 1, 
                    color: colors.TEXT.PRIMARY,
                    fontWeight: '500',
                  }}>
                    {formatPaletteName(palette)}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={24} color={colors.TEXT.SECONDARY} />
                </Pressable>
              }
            >
              <Menu.Item 
                onPress={() => handlePaletteChange('default')} 
                title="Default" 
                leadingIcon={() => (
                  <View style={[styles.colorSwatch, { 
                    backgroundColor: '#6B4DE6', 
                    width: 20, 
                    height: 20, 
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }]} />
                )}
              />
              <Menu.Item 
                onPress={() => handlePaletteChange('citric')} 
                title="Citric" 
                leadingIcon={() => (
                  <View style={[styles.colorSwatch, { 
                    backgroundColor: '#FFB347', 
                    width: 20, 
                    height: 20, 
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }]} />
                )}
              />
              <Menu.Item 
                onPress={() => handlePaletteChange('mint')} 
                title="Mint" 
                leadingIcon={() => (
                  <View style={[styles.colorSwatch, { 
                    backgroundColor: '#4AD66D', 
                    width: 20, 
                    height: 20, 
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }]} />
                )}
              />
              <Menu.Item 
                onPress={() => handlePaletteChange('berry')} 
                title="Berry" 
                leadingIcon={() => (
                  <View style={[styles.colorSwatch, { 
                    backgroundColor: '#FF6B6B', 
                    width: 20, 
                    height: 20, 
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }]} />
                )}
              />
              <Menu.Item 
                onPress={() => handlePaletteChange('ocean')} 
                title="Ocean" 
                leadingIcon={() => (
                  <View style={[styles.colorSwatch, { 
                    backgroundColor: '#2E86DE', 
                    width: 20, 
                    height: 20, 
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }]} />
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
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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