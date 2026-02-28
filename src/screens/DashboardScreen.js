import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fetchAll } from "../database/dbHelper";
import { useColorScheme } from "nativewind";

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState({ courses: 0, activeTasks: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const loadDashboardData = async () => {
    try {
      const coursesData = await fetchAll(
        "SELECT COUNT(*) as count FROM courses",
      );
      const tasksData = await fetchAll(
        "SELECT COUNT(*) as count FROM tasks WHERE status != 'Selesai'",
      );

      setStats({
        courses: coursesData[0]?.count || 0,
        activeTasks: tasksData[0]?.count || 0,
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData().then(() => setRefreshing(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0F172A]">
      {/* Custom Header Area (Optional, since Native navigation header is hidden) */}
      <View className="px-5 pt-4 pb-2 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <Ionicons name="school" size={24} color="#3B82F6" />
          <Text className="text-lg font-bold text-slate-800 dark:text-white ml-2">
            SmartStudy
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={toggleColorScheme}
            className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full items-center justify-center"
          >
            <Ionicons
              name={isDark ? "sunny" : "moon"}
              size={20}
              color={isDark ? "#FBBF24" : "#475569"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="px-5 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">
            Halo, Ziddan!
          </Text>
          <Text className="text-base text-slate-500 dark:text-slate-400">
            Berikut ringkasan aktivitas akademikmu hari ini.
          </Text>
        </View>

        {/* Statistics Cards */}
        <View className="flex-row justify-between mb-8">
          <View className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-[48%] shadow-sm border border-slate-100 dark:border-slate-700 items-start">
            <View className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-xl items-center justify-center mb-3">
              <Ionicons name="document-text" size={20} color="#3B82F6" />
            </View>
            <Text className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              Total Mata Kuliah
            </Text>
            <Text className="text-slate-800 dark:text-white text-3xl font-bold">
              {stats.courses}
            </Text>
          </View>

          <View className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-[48%] shadow-sm border border-slate-100 dark:border-slate-700 items-start">
            <View className="bg-orange-100 dark:bg-orange-900/30 w-10 h-10 rounded-xl items-center justify-center mb-3">
              <Ionicons name="clipboard" size={20} color="#F97316" />
            </View>
            <Text className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              Tugas Belum Selesai
            </Text>
            <Text className="text-slate-800 dark:text-white text-3xl font-bold">
              {stats.activeTasks}
            </Text>
          </View>
        </View>

        {/* Menu Cepat Section */}
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-4">
          Menu Cepat
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("Tugas")}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 mb-3 flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <View className="bg-indigo-100 dark:bg-indigo-900/30 w-12 h-12 rounded-full items-center justify-center mr-4">
              <Ionicons
                name="checkmark-done-circle-outline"
                size={24}
                color="#6366F1"
              />
            </View>
            <View>
              <Text className="text-base font-bold text-slate-800 dark:text-white">
                Tambah Tugas
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-xs">
                Catat tugas baru
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Mata Kuliah")}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 mb-8 flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <View className="bg-pink-100 dark:bg-pink-900/30 w-12 h-12 rounded-full items-center justify-center mr-4">
              <Ionicons name="add-circle-outline" size={24} color="#EC4899" />
            </View>
            <View>
              <Text className="text-base font-bold text-slate-800 dark:text-white">
                Tambah Matkul
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-xs">
                Input mata kuliah baru
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Progress Tugas */}
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-4">
          Progress Tugas
        </Text>
        <View className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-8 items-center py-8">
          <View className="bg-slate-100 dark:bg-slate-700 w-24 h-24 rounded-full items-center justify-center mb-4">
            <Ionicons
              name="bar-chart-outline"
              size={40}
              color={isDark ? "#94A3B8" : "#CBD5E1"}
            />
          </View>
          <Text className="text-slate-800 dark:text-white font-bold text-base mb-1">
            Belum ada data tugas
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center text-xs mb-6 px-4 leading-relaxed">
            Tugas yang kamu tambahkan akan muncul di sini.
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Tugas")}>
            <Text className="text-blue-500 font-medium">Tambah Tugas Baru</Text>
          </TouchableOpacity>
        </View>

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
