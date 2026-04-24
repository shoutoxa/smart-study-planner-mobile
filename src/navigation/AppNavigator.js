import React from "react";
import { View, TouchableOpacity, Text, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
// Import Screens
import DashboardScreen from "../screens/DashboardScreen";
import CoursesScreen from "../screens/CoursesScreen";
import TasksScreen from "../screens/TasksScreen";
import SchedulesScreen from "../screens/SchedulesScreen";
import NotesScreen from "../screens/NotesScreen";
import SettingsScreen from "../screens/SettingsScreen";


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomTabBarButton = ({ children, onPress }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <TouchableOpacity
      style={{
        top: -20,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#3b82f6",
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      }}
      onPress={onPress}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: "#6366f1", // indigo-500
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 4,
          borderColor: isDark ? "#1E293B" : "#f8fafc",
        }}
      >
        {children}
      </View>
      <Text
        style={{
          fontSize: 10,
          color: "#6366f1",
          fontWeight: "bold",
          marginTop: 4,
        }}
      >
        Catatan
      </Text>
    </TouchableOpacity>
  );
};

// Tab Navigator for main screens
function BottomTabNavigator() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Dashboard") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "Mata Kuliah") {
            iconName = focused ? "book" : "book-outline";
          } else if (route.name === "Catatan") {
            return <Ionicons name="add" size={32} color="#fff" />;
          } else if (route.name === "Tugas") {
            iconName = focused
              ? "checkmark-circle"
              : "checkmark-circle-outline";
          } else if (route.name === "Jadwal") {
            iconName = focused ? "calendar" : "calendar-outline";
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: isDark ? "#818CF8" : "#4F46E5", // indigo-400 : indigo-600
        tabBarInactiveTintColor: isDark ? "#64748B" : "#94A3B8", // slate-500 : slate-400
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "android" ? 15 : 25,
          left: 20,
          right: 20,
          elevation: 0,
          backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
          borderRadius: 24,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          shadowColor: isDark ? "#000" : "#94A3B8",
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowOpacity: isDark ? 0.5 : 0.1,
          shadowRadius: 15,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "bold",
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Mata Kuliah"
        component={CoursesScreen}
        options={{ tabBarLabel: "Matkul" }}
      />
      <Tab.Screen
        name="Catatan"
        component={NotesScreen}
        options={{
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen name="Tugas" component={TasksScreen} />
      <Tab.Screen name="Jadwal" component={SchedulesScreen} />
    </Tab.Navigator>
  );
}

// Main App Stack Navigator
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
