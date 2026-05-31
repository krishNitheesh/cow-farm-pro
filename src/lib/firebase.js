// COW FARM Firebase Push Notifications Configuration
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Standard Expo Notifications configuration as a lightweight, cross-platform FCM client
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notifications!');
      return null;
    }
    
    // Get the Expo Push Token (which routes through FCM under the hood for Android)
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('FCM / Expo Push Token:', token);

    // Save token to AsyncStorage or database for this device
    await AsyncStorage.setItem('push_token', token);
    
    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

// Function to trigger a mating notification simulation via FCM
export async function triggerMatingNotification(cowName) {
  console.log(`[FCM Trigger] "${cowName}" READY TO MATE`);
  
  // Show local push notification instantly to simulate Firebase push reception
  if (Platform.OS !== 'web') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mating Alert 📢 💉💉💉💉',
        body: `"${cowName.toUpperCase()}" is READY TO MATE!`,
        sound: true,
      },
      trigger: null, // deliver immediately
    });
  }
}

// Function to trigger a calving notification simulation via FCM
export async function triggerCalvingNotification(cowName) {
  console.log(`[FCM Calving Trigger] "${cowName}" Calving Alert`);

  if (Platform.OS !== 'web') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Calving Alert 🐮🍼',
        body: `HI MOMMY I AM COMMING OUT (From ${cowName.toUpperCase()})`,
        sound: true,
      },
      trigger: null, // deliver immediately
    });
  }
}

// Function to schedule daily milk record entry notifications
export async function scheduleDailyMilkReminderNotifications() {
  if (Platform.OS === 'web') return;

  try {
    // Cancel duplicates
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.title?.includes("ENTER TODAY'S MILK RECORDS")) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }

    // 6:00 AM daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "ENTER TODAY'S MILK RECORDS 🥛🥛🥛",
        body: 'Morning session is active! Log today\'s production details.',
        sound: true,
      },
      trigger: {
        hour: 6,
        minute: 0,
        repeats: true,
      },
    });

    // 6:00 PM daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "ENTER TODAY'S MILK RECORDS 🥛🥛🥛",
        body: 'Evening session is active! Log today\'s production details.',
        sound: true,
      },
      trigger: {
        hour: 18,
        minute: 0,
        repeats: true,
      },
    });

    console.log('Daily milk reminder notifications scheduled successfully!');
  } catch (error) {
    console.error('Error scheduling daily milk reminders:', error);
  }
}
