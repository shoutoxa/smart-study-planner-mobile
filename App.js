import React, { useEffect, useState, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
  AppState,
} from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";
import { widgetTaskHandler } from "./src/widgets/widgetTaskHandler";
import * as Notifications from "expo-notifications";

import AppNavigator from "./src/navigation/AppNavigator";
import { initDatabase } from "./src/database/dbHelper";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Initial and AppState-based widget update
    const handleWidgetUpdate = () => {
      if (Platform.OS === "android") {
        widgetTaskHandler({
          widgetAction: "WIDGET_UPDATE",
          widgetInfo: {},
          renderWidget: (widgetElement) => {
            requestWidgetUpdate({
              widgetName: "ScheduleWidget",
              renderWidget: () => widgetElement,
            });
          },
        }).catch(console.error);
      }
    };

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App has come to the foreground!
        handleWidgetUpdate();
      }
      appState.current = nextAppState;
    });

    handleWidgetUpdate(); // Update immediately on mount

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Initialize SQLite database on app start
    const setupDatabase = async () => {
      try {
        await initDatabase();

        // Push Notifications Permission Setup
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Pengingat Tugas",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#4F46E5",
          });
        }
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        setIsDbReady(true);
      } catch (error) {
        console.error("Initialization failed", error);
        // still set to true to not block app, or handle error state
        setIsDbReady(true);
      }
    };

    setupDatabase();
  }, []);

  if (!isDbReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 10 }}>Menyiapkan Database...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
