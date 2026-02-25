import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.init();
  }
  async init() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }
  async sendAbsenceNotification(childName, date, reason = 'No reason provided') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Absence Alert',
          body: `${childName} was absent on ${date}. ${reason}`,
          data: { 
            type: 'absence',
            childName,
            date,
            reason 
          },
        },
        trigger: { seconds: 1 }, 
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
  async sendTopUpNotification(childName, amount, newBalance) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💰 Pocket Money Topped Up',
          body: `Added $${amount} to ${childName}'s account. New balance: $${newBalance}`,
          data: { 
            type: 'topup',
            childName,
            amount,
            newBalance 
          },
        },
        trigger: { seconds: 1 },
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
  async sendPerformanceAlert(childName, subject, grade) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Performance Update',
          body: `${childName} received ${grade} in ${subject}`,
          data: { 
            type: 'performance',
            childName,
            subject,
            grade 
          },
        },
        trigger: { seconds: 1 },
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
  async sendAttendanceReminder(childName, date) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Attendance Reminder',
          body: `Don't forget to mark ${childName}'s attendance for ${date}`,
          data: { 
            type: 'reminder',
            childName,
            date 
          },
        },
        trigger: { seconds: 1 },
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }
}

export default new NotificationService();
