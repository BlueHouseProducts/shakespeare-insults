import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect } from "expo-router";
import { View, Text, Platform, Alert } from "react-native";
import { Button } from "~/components/Button";
import { Container } from "~/components/Container";

import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
//import * as BackgroundFetch from "expo-background-fetch";

import * as BGTASK from 'expo-background-task';

import { useEffect, useState } from "react";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from "react";
import { Insults } from "~/Constants/Insults";

const INSULT_TASK = "DAILY_INSULT_TASK";

function getRandomInsult() {
  const insult = Insults[Math.floor(Math.random() * Insults.length)];
  return insult.quote;
}

async function scheduleNotification(insult: string, hour: number, minute: number) {
  try {
    const now = new Date();
    const notificationTime = new Date();
    notificationTime.setHours(hour);
    notificationTime.setMinutes(minute);
    notificationTime.setSeconds(0);
    notificationTime.setMilliseconds(0);

    if (notificationTime <= now) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    const delayInSeconds = Math.floor((notificationTime.getTime() - now.getTime()) / 1000);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Daily Insult",
        body: insult,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        seconds: delayInSeconds,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        repeats: false,
      },
    });

    //console.log("Notification scheduled in", delayInSeconds, "seconds.");
  } catch (e) {
    console.error("Failed to schedule notification:", e);
  }
}

// Background task
TaskManager.defineTask(INSULT_TASK, async () => {
  try {
    const hourStr = await AsyncStorage.getItem("insultHour");
    const minuteStr = await AsyncStorage.getItem("insultMinute");

    if (!hourStr || !minuteStr) return BGTASK.BackgroundTaskResult.Failed;

    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    const insult = getRandomInsult();

    await scheduleNotification(insult, hour, minute);
    return BGTASK.BackgroundTaskResult.Success;
  } catch {
    return BGTASK.BackgroundTaskResult.Failed;
  }
});

async function registerBackgroundTask() {
  const status = await BGTASK.getStatusAsync();
  if (status === BGTASK.BackgroundTaskStatus.Available) {
    await BGTASK.registerTaskAsync(INSULT_TASK, {
      minimumInterval: 60 * 60 * 24, // every 24 hours
    });
  }
}


export default function FavsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsEnabledChecked, setNotificationsEnabledChecked] = useState(false);
  const [date, setDate] = useState(new Date());
  const [modalShow, setModalShow] = useState(false);

  function deleteFavs() {
    AsyncStorage.removeItem("userFavList");
  }

  async function CheckNotificationExists() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length > 0;
  }

  async function RemoveNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await BGTASK.unregisterTaskAsync(INSULT_TASK);
    await AsyncStorage.removeItem("insultHour");
    await AsyncStorage.removeItem("insultMinute");
  }
  

  async function CreateNotifications(hour: number, minute: number) {
    const insult = getRandomInsult();

    await AsyncStorage.setItem("insultHour", hour.toString());
    await AsyncStorage.setItem("insultMinute", minute.toString());

    await scheduleNotification(insult, hour, minute);
    await registerBackgroundTask();
  }

  async function requestNotificationPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Notification permissions are required to enable reminders.'
      );
      return false;
    }
    return true;
  }

  useFocusEffect(
    React.useCallback(() => {
      const check = async () => {
        const exists = await CheckNotificationExists();
        setNotificationsEnabled(exists);
        setNotificationsEnabledChecked(true);
      };
      check();
    }, [])
  );

  async function NotificationButtonPressed() {
    if (!notificationsEnabledChecked || modalShow) return;

    setNotificationsEnabledChecked(false);

    if (notificationsEnabled) {
      await RemoveNotifications();
      setNotificationsEnabled(false);
      setNotificationsEnabledChecked(true);
    } else {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setNotificationsEnabledChecked(true);
        return;
      }

      setModalShow(true);
    }
  }

  function TimeChanged(event: DateTimePickerEvent, selectedDate: Date | undefined) {
    setModalShow(false);

    if (event.type === "set" && selectedDate) {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();
      setDate(selectedDate);

      CreateNotifications(hour, minute).then(() => {
        setNotificationsEnabled(true);
        setNotificationsEnabledChecked(true);
      });
    } else {
      setNotificationsEnabled(false);
      setNotificationsEnabledChecked(true);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Container>
        {!modalShow ? (
          <View className="flex-1 items-center justify-start p-4 w-full">
            <Text className="text-3xl">Settings</Text>

            <Button
              className="mt-4 border-0 bg-green-300"
              onPress={NotificationButtonPressed}
              title={
                notificationsEnabledChecked
                  ? notificationsEnabled
                    ? "Disable Notifications"
                    : "Enable Notifications"
                  : "Loading Notifications..."
              }
            />
            <Button className="mt-4" onPress={deleteFavs} title="Delete all favourites" />
            <Text className="bottom-2 absolute text-lg">{"app made by ed jos :)"}</Text>

            {/*<Button
            //  className="mt-4"
            //  title="DEV Log Scheduled Notifications"
            //  onPress={async () => {
            //    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            //    console.log("Scheduled Notifications:", scheduled);
            //  }}
            ///> */}
          </View>
        ) : (
          <View className="p-3">
            <Text className="text-3xl">Enable Notifications</Text>
            <DateTimePicker
              value={date}
              display="clock"
              mode="time"
              is24Hour={false}
              onChange={TimeChanged}
            />
          </View>
        )}
      </Container>
    </>
  );
}
