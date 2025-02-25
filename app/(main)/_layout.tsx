import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getNavigationTheme } from '../../src/styles/theme';
import { MainTabParamList } from '../../src/types/navigation';
import { useTheme } from '../../src/contexts/theme';
import React from 'react';
import { View, Animated, Pressable, StyleSheet, Dimensions, Switch, Platform, ScrollView, TextStyle } from 'react-native';
import { Avatar, Text, IconButton, Button, Divider, RadioButton, Menu } from 'react-native-paper';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useRouter, usePathname } from 'expo-router';
import * as Font from 'expo-font';
import { useFonts } from 'expo-font';
import { BlurView } from 'expo-blur';
import * as SplashScreen from 'expo-splash-screen';

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
  const { theme } = useTheme();

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

  // Define the circular corner radius (can be adjusted for different curvature)
  const cornerRadius = Platform.OS === 'ios' ? 24 : 20;

  return (
    <View style={{
      position: 'absolute',
      bottom: -4,
      left: 0,
      right: 0,
      overflow: 'hidden',
      borderTopLeftRadius: cornerRadius,
      borderTopRightRadius: cornerRadius,
      marginHorizontal: 8,
      marginBottom: Platform.OS === 'ios' ? 0 : 4,
      // Simpler shadow
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        android: {
          elevation: 4,
        }
      }),
    }}>
      <View style={{
        flexDirection: 'row',
        height: Platform.OS === 'ios' ? 90 : 65,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        borderTopWidth: 0.5,
        borderTopColor: theme === 'dark' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(0, 0, 0, 0.1)',
        paddingHorizontal: 16,
        paddingTop: 12,
        elevation: 0,
        borderTopLeftRadius: cornerRadius,
        borderTopRightRadius: cornerRadius,
        backgroundColor: theme === 'dark' ? '#121212' : '#f1f6f9', // Updated to light theme background color
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
                paddingVertical: 4,
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
                  width: '100%',
                  paddingVertical: 8,
                  transform: [{ 
                    scale: isFocused ? 1.08 : 1 
                  }],
                }}
              >
                {isFocused && (
                  <Animated.View 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 8,
                      right: 8,
                      bottom: 0,
                      backgroundColor: 
                        colors.TAB_BAR.ACTIVE + (Platform.OS === 'ios' ? '08' : '05'), // More subtle highlight for glass effect
                      borderRadius: 16,
                      zIndex: -1,
                      // Add subtle inner shadow/glow for active tab
                      ...Platform.select({
                        ios: {
                          shadowColor: colors.TAB_BAR.ACTIVE,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.2,
                          shadowRadius: 6,
                        }
                      }),
                    }}
                  />
                )}
                <MaterialCommunityIcons
                  name={TAB_ICONS[route.name as keyof typeof TAB_ICONS]}
                  size={24}
                  color={isFocused ? colors.TAB_BAR.ACTIVE : colors.TAB_BAR.INACTIVE}
                  style={{
                    marginBottom: 4,
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
                    marginTop: 1,
                  }}
                >
                  {label}
                </Text>
                {isFocused && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      width: 12,
                      height: 2,
                      borderRadius: 1,
                      backgroundColor: colors.TAB_BAR.ACTIVE,
                    }}
                  />
                )}
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

type ProfileData = {
  id: string;
  name: string | null;
  username: string | null;
  profile_pic_url: string | null;
};

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Create a custom Text component that works with React Native Paper
const FontText = ({ 
  style, 
  fontFamily, 
  children, 
  ...restProps 
}: { 
  style?: any, 
  fontFamily?: string, 
  children: React.ReactNode,
  [key: string]: any 
}) => {
  // Build the style object with font family
  const fontStyle: TextStyle = fontFamily 
    ? { 
        fontFamily,
        // On Android, using both fontFamily and fontWeight: 'bold' can cause issues
        ...(Platform.OS === 'android' ? { fontWeight: 'normal' } : {})
      } 
    : {};
  
  return (
    <Text style={[fontStyle, style]} {...restProps}>
      {children}
    </Text>
  );
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
  
  // Load custom fonts - update to use the exact font name from file
  const [fontsLoaded] = useFonts({
    'Montserrat-Bold': require('../../assets/fonts/Montserrat-Bold.ttf'),
  });
  
  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);
  
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

  // Custom header component with blur effect
  const CustomHeader = ({ title, right }: { title: React.ReactNode, right: React.ReactNode }) => {
    return (
      <View style={{
        height: Platform.OS === 'ios' ? 90 : 70,
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.BORDER,
        position: 'relative',
        backgroundColor: colors.BACKGROUND,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          flex: 1,
        }}>
          {title}
          {right}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.BACKGROUND }}>
      {fontsLoaded ? (
        <>
          <Tabs
            tabBar={(props) => isOnChatDetail ? null : <CustomTabBar {...props} colors={colors} />}
            screenOptions={{
              headerTitle: () => (
                <View style={{
                  justifyContent: 'center',
                  height: '100%',
                  paddingTop: 10,
                }}>
                  <FontText 
                    fontFamily='Montserrat-Bold'
                    style={{ 
                      fontSize: 34,
                      fontWeight: Platform.OS === 'android' ? undefined : 'bold',
                      color: colors.TAB_BAR.ACTIVE,
                      letterSpacing: 6.5,
                      textShadowColor: theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2.5,
                      // Slight text outline effect for better readability
                      ...(Platform.OS === 'ios' ? {
                        shadowColor: theme === 'dark' ? colors.TEXT.PRIMARY : colors.TEXT.SECONDARY,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.2,
                        shadowRadius: 0.5,
                      } : {})
                    }}
                  >
                    Saner
                  </FontText>
                </View>
              ),
              header: ({ route, options, navigation }) => {
                const title = typeof options.headerTitle === 'function' 
                  ? options.headerTitle({ children: route.name })
                  : options.headerTitle || route.name;
                
                const right = options.headerRight ? 
                  options.headerRight({ tintColor: colors.TEXT.PRIMARY, pressColor: colors.BORDER, canGoBack: navigation.canGoBack() }) 
                  : null;
                
                return <CustomHeader title={title} right={right} />;
              },
              headerStyle: {
                backgroundColor: 'transparent',
                elevation: 0,
                shadowOpacity: 0,
              },
              headerShadowVisible: false,
              headerRight: () => (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  height: '100%',
                }}>
                  <IconButton
                    icon="magnify"
                    size={24}
                    iconColor={colors.ICONS.PRIMARY}
                    onPress={() => router.push('/(main)/search')}
                    style={{ 
                      marginRight: 4,
                      backgroundColor: Platform.OS === 'ios' ? 
                        (theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)') : 
                        'transparent',
                      borderRadius: 30,
                      width: 40,
                      height: 40,
                    }}
                  />
                  {profile?.profile_pic_url ? (
                    <Pressable
                      onPress={toggleMenu}
                      style={({ pressed }) => ({
                        marginRight: 16,
                        opacity: pressed ? 0.7 : 1,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                        borderRadius: 20,
                        borderWidth: theme === 'dark' ? 1 : 0,
                        borderColor: theme === 'dark' ? colors.BORDER : 'transparent',
                        padding: 2,
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
                      iconColor={colors.ICONS.PRIMARY}
                      onPress={toggleMenu}
                      style={{ 
                        marginRight: 8,
                        backgroundColor: Platform.OS === 'ios' ? 
                          (theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)') : 
                          'transparent',
                        borderRadius: 30,
                        width: 40,
                        height: 40,
                      }}
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
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 