import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getNavigationTheme } from '../../src/styles/theme';
import { MainTabParamList } from '../../src/types/navigation';
import { useTheme } from '../../src/contexts/theme';
import { View } from 'react-native';

const TAB_ICONS = {
  discover: 'compass',
  breath: 'weather-windy',
  write: 'pencil-plus',
  chat: 'chat',
  profile: 'account',
} as const;

export default function MainLayout() {
  const { theme, colors } = useTheme();
  const navigationTheme = getNavigationTheme(theme);

  return (
    <View style={{ flex: 1, backgroundColor: colors.BACKGROUND }}>
      <Tabs
        screenOptions={{
          ...navigationTheme.screenOptions,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons 
                name={TAB_ICONS.discover} 
                size={size + 2} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="breath"
          options={{
            title: 'Breath',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons 
                name={TAB_ICONS.breath} 
                size={size + 2} 
                color={color} 
              />
            ),
            headerShown: false
          }}
        />
        <Tabs.Screen
          name="write"
          options={{
            title: 'Write',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons 
                name={TAB_ICONS.write} 
                size={size + 2} 
                color={color} 
              />
            ),
            tabBarLabel: 'Write 🪄',
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons 
                name={TAB_ICONS.chat} 
                size={size + 2} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons 
                name={TAB_ICONS.profile} 
                size={size + 2} 
                color={color} 
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
} 