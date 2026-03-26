import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const canViewAdminData = user?.role === 'admin' || user?.role === 'supervisor';
  const canManageUsers = user?.role === 'admin';

  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: canViewAdminData ? 'Forms' : 'Surveys',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={canViewAdminData ? 'layers-outline' : 'checkbox-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="responses"
        options={{
          title: canViewAdminData ? 'Data' : 'My Responses',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          href: canManageUsers ? undefined : null,
          title: 'Users',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
