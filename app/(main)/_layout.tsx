import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { Platform } from 'react-native';

export default function MainLayout() {
  const theme = useTheme();

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#6B4DE6',
      tabBarInactiveTintColor: '#9E9E9E',
      tabBarStyle: {
        height: Platform.OS === 'ios' ? 88 : 68,
        paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        paddingTop: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.06)',
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
      },
      tabBarIconStyle: {
        marginTop: 4,
      },
      headerStyle: {
        backgroundColor: '#FFFFFF',
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.06)',
      },
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
        color: '#1A1A1A',
      },
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
            <MaterialCommunityIcons name="compass" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="breath"
        options={{
          title: 'Breath',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="weather-windy" size={size + 2} color={color} />
          ),
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: 'Write',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="pencil-plus" size={size + 2} color={color} />
          ),
          tabBarLabel: 'Write 🪄',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size + 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
} 