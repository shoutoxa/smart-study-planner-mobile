import React, { useCallback, useEffect, useState, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
  AppState,
  TouchableOpacity,
} from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";
import { widgetTaskHandler } from "./src/widgets/widgetTaskHandler";
import * as Notifications from "expo-notifications";

import AppNavigator from "./src/navigation/AppNavigator";
import { initDatabase } from "./src/database/dbHelper";
import { ensureTaskReminderChannel } from "./src/services/notificationService";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [initAttempt, setInitAttempt] = useState(0);
  const appState = useRef(AppState.currentState);

  const handleWidgetUpdate = useCallback(() => {
    if (Platform.OS !== "android" || !isDbReady) return;

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
  }, [isDbReady]);

  useEffect(() => {
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

    return () => {
      subscription.remove();
    };
  }, [handleWidgetUpdate]);

  useEffect(() => {
    handleWidgetUpdate();
  }, [handleWidgetUpdate]);

  useEffect(() => {
    // Initialize SQLite database on app start
    const setupDatabase = async () => {
      try {
        setIsDbReady(false);
        setInitError(null);
        await initDatabase();

        if (Platform.OS !== "web") {
          if (Platform.OS === "android") {
            await ensureTaskReminderChannel();
          }

          const { status: existingStatus } =
            await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus !== "granted") {
            console.warn("Notification permission was not granted.");
          }
        }

        setIsDbReady(true);
      } catch (error) {
        console.error("Initialization failed", error);
        setInitError(error);
        setIsDbReady(false);
      }
    };

    setupDatabase();
  }, [initAttempt]);

  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>
          Gagal menyiapkan aplikasi
        </Text>
        <Text style={{ color: "#64748B", textAlign: "center", marginBottom: 20 }}>
          Database tidak bisa dibuka. Coba ulangi inisialisasi aplikasi.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Coba lagi menyiapkan aplikasi"
          onPress={() => setInitAttempt((value) => value + 1)}
          style={{
            backgroundColor: "#4F46E5",
            borderRadius: 14,
            paddingHorizontal: 18,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
