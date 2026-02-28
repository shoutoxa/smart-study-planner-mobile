import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator } from "react-native";

import AppNavigator from "./src/navigation/AppNavigator";
import { initDatabase } from "./src/database/dbHelper";

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    // Initialize SQLite database on app start
    const setupDatabase = async () => {
      try {
        await initDatabase();
        setIsDbReady(true);
      } catch (error) {
        console.error("Database initialization failed", error);
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
