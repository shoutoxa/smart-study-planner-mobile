import React from "react";
import { View, TouchableOpacity, Text, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

// Import Screens
import DashboardScreen from "../screens/DashboardScreen";
import CoursesScreen from "../screens/CoursesScreen";
import TasksScreen from "../screens/TasksScreen";
import SchedulesScreen from "../screens/SchedulesScreen";
import NotesScreen from "../screens/NotesScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity
    className="top-[-20px] justify-center items-center"
    style={{
      shadowColor: "#3b82f6",
      shadowOpacity: 0.3,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    }}
    onPress={onPress}
  >
    <View className="w-16 h-16 rounded-full bg-blue-500 justify-center items-center border-[4px] border-slate-50 dark:border-slate-900 shadow-xl">
      {children}
    </View>
    <Text className="text-[10px] text-blue-500 font-bold mt-1">Catatan</Text>
  </TouchableOpacity>
);

// Tab Navigator for main screens
function BottomTabNavigator() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
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
            return <Ionicons name="document-text" size={28} color="#fff" />;
          } else if (route.name === "Tugas") {
            iconName = focused
              ? "checkmark-circle"
              : "checkmark-circle-outline";
          } else if (route.name === "Jadwal") {
            iconName = focused ? "calendar" : "calendar-outline";
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: isDark ? "#60A5FA" : "#3B82F6", // blue-400 : blue-500
        tabBarInactiveTintColor: isDark ? "#64748B" : "#94A3B8", // slate-500 : slate-400
        tabBarStyle: {
          paddingBottom:
            Platform.OS === "android" ? insets.bottom + 10 : insets.bottom,
          paddingTop: 10,
          height: Platform.OS === "android" ? 70 + insets.bottom : 85,
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF", // slate-900
          borderTopWidth: 1,
          borderTopColor: isDark ? "#1E293B" : "#F1F5F9",
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "bold",
          marginTop: 2,
        },
        tabBarShowLabel: route.name !== "Catatan",
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
    </Stack.Navigator>
  );
}
