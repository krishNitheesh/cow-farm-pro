import React, { useContext } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, List, Droplet, DollarSign, Crosshair, HeartPulse, BookOpen, Wheat } from 'lucide-react-native';

import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CowsScreen from '../screens/CowsScreen';
import MilkScreen from '../screens/MilkScreen';
import FinanceScreen from '../screens/FinanceScreen';
import HealthScreen from '../screens/HealthScreen';
import FeedScreen from '../screens/FeedScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VendeeScreen from '../screens/VendeeScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#bba284',
                tabBarInactiveTintColor: '#8a7c6f',
                tabBarStyle: {
                    backgroundColor: '#382a20',
                    borderTopWidth: 1,
                    borderTopColor: '#26170d',
                    paddingBottom: Platform.OS === 'ios' ? 30 : 25,
                    height: Platform.OS === 'ios' ? 100 : 90,
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={HomeScreen}
                options={{ tabBarIcon: ({ color }) => <Home color={color} size={24} /> }}
            />
            <Tab.Screen
                name="Cows"
                component={CowsScreen}
                options={{ tabBarLabel: 'Cow Book', tabBarIcon: ({ color }) => <BookOpen color={color} size={24} /> }}
            />
            <Tab.Screen
                name="Milk"
                component={MilkScreen}
                options={{ tabBarIcon: ({ color }) => <Droplet color={color} size={24} /> }}
            />
            <Tab.Screen
                name="Finance"
                component={FinanceScreen}
                options={{ tabBarIcon: ({ color }) => <DollarSign color={color} size={24} /> }}
            />
            <Tab.Screen
                name="Health"
                component={HealthScreen}
                options={{ tabBarIcon: ({ color }) => <HeartPulse color={color} size={24} /> }}
            />
            <Tab.Screen
                name="Feed"
                component={FeedScreen}
                options={{ tabBarIcon: ({ color }) => <Wheat color={color} size={24} /> }}
            />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { userToken, isLoading } = useContext(AuthContext);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#26170d' }}>
                <ActivityIndicator size="large" color="#bba284" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#26170d' } }}>
                {userToken === null ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <>
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="Vendees" component={VendeeScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
