import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fetchAll } from "../database/dbHelper";
import { useColorScheme, Appearance } from "react-native";
import InteractiveCard from "../components/InteractiveCard";

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState({ courses: 0, activeTasks: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const loadDashboardData = async () => {
    try {
      const coursesData = await fetchAll(
        "SELECT COUNT(*) as count FROM courses",
      );
      const tasksData = await fetchAll(
        "SELECT COUNT(*) as count FROM tasks WHERE status != 'Selesai'",
      );

      const recentTasksData = await fetchAll(
        "SELECT t.*, c.course_name FROM tasks t LEFT JOIN courses c ON t.course_id = c.id WHERE t.status != 'Selesai' ORDER BY t.deadline ASC LIMIT 3",
      );

      setStats({
        courses: coursesData[0]?.count || 0,
        activeTasks: tasksData[0]?.count || 0,
      });
      setRecentTasks(recentTasksData);
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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View className="px-6 pt-6 pb-2 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl items-center justify-center mr-3">
            <Ionicons name="school" size={20} color="#4F46E5" />
          </View>
          <Text className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            SmartStudy
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Appearance.setColorScheme(isDark ? "light" : "dark")}
          activeOpacity={0.7}
          className="w-11 h-11 bg-white dark:bg-slate-800 rounded-full items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <Ionicons
            name={isDark ? "sunny" : "moon"}
            size={22}
            color={isDark ? "#FBBF24" : "#64748B"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="px-6 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#cbd5e1" : "#475569"}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 mt-2">
          <Text className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 mb-1 tracking-widest uppercase">
            Dashboard
          </Text>
          <Text className="text-4xl font-serif font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
            Halo, Mahasiswa!
          </Text>
          <Text className="text-base text-slate-500 dark:text-slate-400">
            Berikut ringkasan aktivitas akademikmu hari ini.
          </Text>
        </View>

        {/* Edu.diksi styled Bento Main Card */}
        <View className="mb-6">
          <InteractiveCard scaleTo={0.98}>
            <View className="bg-[#1e293b] dark:bg-[#1a365d] rounded-[32px] p-6 shadow-md shadow-indigo-500/10 overflow-hidden border border-slate-700 dark:border-slate-600/50">
              {/* Background design elements */}
              <View className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500/20 rounded-full" />
              <View className="absolute -left-6 -bottom-6 w-24 h-24 bg-emerald-500/20 rounded-full" />

              <View className="flex-row justify-between items-start mb-6 z-10">
                <View>
                  <Text className="text-slate-300 text-xs font-bold tracking-wider mb-1">
                    STATUS AKADEMIK
                  </Text>
                  <Text className="text-white text-3xl font-serif font-bold tracking-tight">
                    Aktif
                  </Text>
                </View>
                <View className="bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
                  <Text className="text-emerald-400 text-xs font-bold">
                    Semester Ini
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center bg-white/10 p-4 rounded-2xl border border-white/5 z-10">
                <View className="w-12 h-12 bg-indigo-500/30 rounded-xl items-center justify-center mr-4">
                  <Ionicons name="flame" size={24} color="#FBBF24" />
                </View>
                <View>
                  <Text className="text-white font-bold text-lg">
                    {stats.activeTasks} Tugas
                  </Text>
                  <Text className="text-indigo-200 text-xs">
                    Menunggu diselesaikan
                  </Text>
                </View>
              </View>
            </View>
          </InteractiveCard>
        </View>

        {/* Statistics Grid */}
        <View className="flex-row justify-between mb-8">
          <View className="w-[48%]">
            <InteractiveCard>
              <View className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 items-start">
                <View className="bg-blue-50 dark:bg-blue-900/30 w-12 h-12 rounded-[16px] items-center justify-center mb-4">
                  <Ionicons name="library" size={22} color="#3B82F6" />
                </View>
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                  Mata Kuliah
                </Text>
                <Text className="text-slate-800 dark:text-white text-3xl font-serif font-bold">
                  {stats.courses}
                </Text>
              </View>
            </InteractiveCard>
          </View>

          <View className="w-[48%]">
            <InteractiveCard>
              <View className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 items-start">
                <View className="bg-rose-50 dark:bg-rose-900/30 w-12 h-12 rounded-[16px] items-center justify-center mb-4">
                  <Ionicons name="clipboard" size={22} color="#F43F5E" />
                </View>
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                  Tugas Aktif
                </Text>
                <Text className="text-slate-800 dark:text-white text-3xl font-serif font-bold">
                  {stats.activeTasks}
                </Text>
              </View>
            </InteractiveCard>
          </View>
        </View>

        {/* Menu Cepat Section */}
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-4 tracking-tight">
          Aksi Cepat
        </Text>

        <View className="flex-row justify-between mb-8">
          <View className="w-[48%]">
            <InteractiveCard onPress={() => navigation.navigate("Tugas")}>
              <View className="bg-indigo-600 dark:bg-indigo-500 rounded-[24px] p-5 items-center justify-center shadow-md shadow-indigo-500/30">
                <View className="bg-white/20 w-12 h-12 rounded-full items-center justify-center mb-3">
                  <Ionicons name="add" size={28} color="white" />
                </View>
                <Text className="text-white font-bold text-center">
                  Tambah{"\n"}Tugas
                </Text>
              </View>
            </InteractiveCard>
          </View>

          <View className="w-[48%]">
            <InteractiveCard onPress={() => navigation.navigate("Mata Kuliah")}>
              <View className="bg-emerald-500 dark:bg-emerald-600 rounded-[24px] p-5 items-center justify-center shadow-md shadow-emerald-500/30">
                <View className="bg-white/20 w-12 h-12 rounded-full items-center justify-center mb-3">
                  <Ionicons name="school" size={24} color="white" />
                </View>
                <Text className="text-white font-bold text-center">
                  Tambah{"\n"}Matkul
                </Text>
              </View>
            </InteractiveCard>
          </View>
        </View>

        {/* Progress Tugas Area */}
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-4 tracking-tight">
          Ringkasan Belajar
        </Text>

        <View className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 mb-8 overflow-hidden">
          {recentTasks.length === 0 ? (
            <View className="items-center py-6">
              <View className="absolute -right-8 -top-8 w-24 h-24 bg-slate-50 dark:bg-slate-700/30 rounded-full" />
              <View className="bg-slate-50 dark:bg-slate-700/50 w-24 h-24 rounded-full items-center justify-center mb-5 border-4 border-white dark:border-slate-800 shadow-sm">
                <Ionicons
                  name="analytics"
                  size={36}
                  color={isDark ? "#94A3B8" : "#94A3B8"}
                />
              </View>
              <Text className="text-slate-800 dark:text-white font-serif font-bold text-xl mb-2 text-center">
                Yeay, Belum ada tugas!
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center text-sm mb-6 px-4 leading-relaxed">
                Tugas yang kamu buat akan muncul di sini.
              </Text>
              <InteractiveCard
                scaleTo={0.95}
                onPress={() => navigation.navigate("Tugas")}
              >
                <View className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-6 py-3 rounded-full">
                  <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    Buat Tugas Baru
                  </Text>
                </View>
              </InteractiveCard>
            </View>
          ) : (
            <View>
              {recentTasks.map((task, index) => {
                let priorityStyles = {
                  backgroundColor: isDark
                    ? "rgba(59, 130, 246, 0.15)"
                    : "#eff6ff", // blue-50 : blue-500/10
                  color: isDark ? "#60A5FA" : "#3b82f6", // blue-400 : blue-500
                };

                if (task.priority === "Tinggi") {
                  priorityStyles = {
                    backgroundColor: isDark
                      ? "rgba(244, 63, 94, 0.15)"
                      : "#fff1f2", // rose-50 : rose-500/10
                    color: isDark ? "#FB7185" : "#f43f5e", // rose-400 : rose-500
                  };
                } else if (task.priority === "Sedang") {
                  priorityStyles = {
                    backgroundColor: isDark
                      ? "rgba(249, 115, 22, 0.15)"
                      : "#fff7ed", // orange-50 : orange-500/10
                    color: isDark ? "#FB923C" : "#f97316", // orange-400 : orange-500
                  };
                }

                return (
                  <InteractiveCard
                    key={task.id}
                    onPress={() => navigation.navigate("Tugas")}
                    scaleTo={0.97}
                    className="mb-3"
                  >
                    <View className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-[20px] border border-slate-100 dark:border-slate-700 flex-row items-center">
                      <View className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full items-center justify-center mr-4">
                        <Ionicons
                          name="document-text"
                          size={18}
                          color="#4F46E5"
                        />
                      </View>
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-center mb-1">
                          <View
                            className="px-2 py-0.5 rounded mr-2"
                            style={{
                              backgroundColor: priorityStyles.backgroundColor,
                            }}
                          >
                            <Text
                              className="text-[9px] font-bold uppercase tracking-wider"
                              style={{ color: priorityStyles.color }}
                            >
                              {task.priority || "Rendah"}
                            </Text>
                          </View>
                          <Text className="text-[11px] text-slate-500 dark:text-slate-400 font-medium font-serif">
                            {task.course_name || "Umum"}
                          </Text>
                        </View>
                        <Text
                          className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-snug"
                          numberOfLines={1}
                        >
                          {task.task_name}
                        </Text>
                        {task.deadline ? (
                          <Text className="text-xs text-rose-500 font-medium mt-1">
                            <Ionicons name="time-outline" size={12} />{" "}
                            {task.deadline}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={isDark ? "#475569" : "#CBD5E1"}
                      />
                    </View>
                  </InteractiveCard>
                );
              })}

              <TouchableOpacity
                onPress={() => navigation.navigate("Tugas")}
                className="mt-2 items-center py-2"
              >
                <Text className="text-indigo-500 dark:text-indigo-400 font-bold text-sm">
                  Lihat Semua Tugas ({stats.activeTasks})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
