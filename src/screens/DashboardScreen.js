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
import { ProgressChart } from "react-native-chart-kit";

const DAYS_BY_JS_DAY = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState({ courses: 0, activeTasks: 0, completedTasks: 0, totalTasks: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [nextSchedule, setNextSchedule] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const loadDashboardData = useCallback(async () => {
    try {
      const now = new Date();
      const todayName = DAYS_BY_JS_DAY[now.getDay()];
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      const coursesData = await fetchAll(
        "SELECT COUNT(*) as count FROM courses",
      );
      const tasksData = await fetchAll(
        "SELECT COUNT(*) as count FROM tasks WHERE status != 'Selesai'",
      );
      const completedTasksData = await fetchAll(
        "SELECT COUNT(*) as count FROM tasks WHERE status = 'Selesai'",
      );
      const allTasksData = await fetchAll(
        "SELECT COUNT(*) as count FROM tasks",
      );

      const recentTasksData = await fetchAll(
        `SELECT t.*, c.course_name
         FROM tasks t
         LEFT JOIN courses c ON t.course_id = c.id
         WHERE t.status != 'Selesai'
         ORDER BY
          CASE WHEN t.deadline_at IS NULL THEN 1 ELSE 0 END ASC,
          t.deadline_at ASC
         LIMIT 3`,
      );

      const nextScheduleData = await fetchAll(
        `SELECT cs.*, c.course_name, c.lecturer_name
         FROM class_schedules cs
         JOIN courses c ON cs.course_id = c.id
         WHERE cs.day_of_week = ?
          AND cs.start_time >= ?
          AND cs.is_active = 1
         ORDER BY cs.start_time ASC
         LIMIT 1`,
        [todayName, currentTime],
      );

      setStats({
        courses: coursesData[0]?.count || 0,
        activeTasks: tasksData[0]?.count || 0,
        completedTasks: completedTasksData[0]?.count || 0,
        totalTasks: allTasksData[0]?.count || 0,
      });
      setRecentTasks(recentTasksData);
      setNextSchedule(nextScheduleData[0] || null);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData().then(() => setRefreshing(false));
  }, [loadDashboardData]);

  const navigateWithOpenAdd = useCallback((screenName) => {
    navigation.navigate(screenName, { openAdd: Date.now() });
  }, [navigation]);

  const openScheduleFlow = useCallback(() => {
    if (stats.courses === 0) {
      navigateWithOpenAdd("Mata Kuliah");
      return;
    }
    navigateWithOpenAdd("Jadwal");
  }, [navigateWithOpenAdd, stats.courses]);

  const quickActions = [
    {
      label: "Tambah Tugas",
      icon: "checkbox",
      color: "bg-blue-500 dark:bg-blue-600",
      onPress: () => navigateWithOpenAdd("Tugas"),
      accessibilityLabel: "Tambah tugas baru",
    },
    {
      label: "Tambah Matkul",
      icon: "school",
      color: "bg-emerald-500 dark:bg-emerald-600",
      onPress: () => navigateWithOpenAdd("Mata Kuliah"),
      accessibilityLabel: "Tambah mata kuliah baru",
    },
    {
      label: "Tambah Jadwal",
      icon: "calendar",
      color: "bg-orange-500 dark:bg-orange-600",
      onPress: openScheduleFlow,
      accessibilityLabel:
        stats.courses === 0
          ? "Tambah mata kuliah terlebih dahulu untuk membuat jadwal"
          : "Tambah jadwal kuliah baru",
    },
    {
      label: "Tulis Catatan",
      icon: "create",
      color: "bg-slate-700 dark:bg-slate-600",
      onPress: () => navigateWithOpenAdd("Catatan"),
      accessibilityLabel: "Tulis catatan baru",
    },
  ];

  const completionRate =
    stats.totalTasks > 0 ? stats.completedTasks / stats.totalTasks : 0;
  const completionPercent = Math.round(completionRate * 100);

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
        <View className="flex-row items-center gap-x-2">
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Buka pengaturan"
            className="w-11 h-11 bg-white dark:bg-slate-800 rounded-full items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <Ionicons name="settings" size={22} color={isDark ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Appearance.setColorScheme(isDark ? "light" : "dark")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isDark ? "Ubah ke mode terang" : "Ubah ke mode gelap"}
            className="w-11 h-11 bg-white dark:bg-slate-800 rounded-full items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <Ionicons
              name={isDark ? "sunny" : "moon"}
              size={22}
              color={isDark ? "#FBBF24" : "#64748B"}
            />
          </TouchableOpacity>
        </View>
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
            <View className="bg-blue-500 dark:bg-blue-600 rounded-[24px] p-6 overflow-hidden border border-blue-500 dark:border-blue-500/40">
              <View className="flex-row justify-between items-start mb-6">
                <View>
                  <Text className="text-blue-100 dark:text-blue-100 text-xs font-bold tracking-wider mb-1">
                    STATUS AKADEMIK
                  </Text>
                  <Text className="text-white text-3xl font-serif font-bold tracking-tight">
                    Aktif
                  </Text>
                </View>
                <View className="bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
                  <Text className="text-emerald-300 dark:text-emerald-400 text-xs font-bold">
                    Semester Ini
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center bg-white/10 p-4 rounded-2xl border border-white/10">
                <View className="w-12 h-12 bg-indigo-400/30 rounded-xl items-center justify-center mr-4">
                  <Ionicons name="flame" size={24} color="#FBBF24" />
                </View>
                <View>
                  <Text className="text-white font-bold text-lg">
                    {stats.activeTasks} Tugas
                  </Text>
                  <Text className="text-blue-100 text-xs">
                    Menunggu diselesaikan
                  </Text>
                </View>
              </View>
            </View>
          </InteractiveCard>
        </View>

        {/* Chart Section */}
        {stats.totalTasks > 0 && (
          <View className="mb-6 bg-white dark:bg-slate-800 rounded-[24px] p-6 border border-slate-100 dark:border-slate-700">
            <Text className="text-slate-800 dark:text-white font-bold text-lg mb-2">
              Penyelesaian Tugas
            </Text>
            <View className="w-full flex-row items-center justify-center">
              <ProgressChart
                data={{
                  labels: [""],
                  data: [completionRate]
                }}
                width={150}
                height={132}
                strokeWidth={14}
                radius={42}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: isDark ? "#1e293b" : "#ffffff",
                  backgroundGradientTo: isDark ? "#1e293b" : "#ffffff",
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // emerald-500
                  labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(30, 41, 59, ${opacity})`,
                }}
                hideLegend
                style={{ borderRadius: 16 }}
              />
              <View className="flex-1 min-w-0 ml-2">
                <View className="flex-row items-center mb-1">
                  <View className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                  <Text
                    className="text-slate-700 dark:text-slate-200 font-semibold text-sm flex-shrink"
                    numberOfLines={1}
                  >
                    Selesai {completionPercent}%
                  </Text>
                </View>
                <Text
                  className="text-slate-500 dark:text-slate-400 text-xs"
                  numberOfLines={1}
                >
                  {stats.completedTasks} dari {stats.totalTasks} tugas
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Statistics Grid */}
        <View className="flex-row justify-between mb-8">
          <View className="w-[48%]">
                <InteractiveCard>
                  <View className="bg-white dark:bg-slate-800 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700 items-start">
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
                  <View className="bg-white dark:bg-slate-800 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700 items-start">
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

        {/* Next Schedule */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
              Jadwal Berikutnya
            </Text>
            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Hari Ini
            </Text>
          </View>
          {nextSchedule ? (
            <InteractiveCard
              onPress={() => navigation.navigate("Jadwal")}
              accessibilityLabel={`Jadwal berikutnya ${nextSchedule.course_name} pukul ${nextSchedule.start_time}`}
              accessibilityHint="Buka halaman Jadwal"
            >
              <View className="bg-white dark:bg-slate-800 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700 flex-row items-center">
                <View className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 items-center justify-center mr-4 border border-orange-100 dark:border-orange-500/20">
                  <Ionicons name="time" size={24} color="#F97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 dark:text-white font-bold text-base leading-snug" numberOfLines={1}>
                    {nextSchedule.course_name}
                  </Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                    {nextSchedule.start_time} - {nextSchedule.end_time} · {nextSchedule.room || "Ruang TBA"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDark ? "#475569" : "#CBD5E1"}
                />
              </View>
            </InteractiveCard>
          ) : (
            <View className="bg-white dark:bg-slate-800 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700 flex-row items-center">
              <View className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-700/50 items-center justify-center mr-4">
                <Ionicons name="calendar-outline" size={24} color={isDark ? "#94A3B8" : "#64748B"} />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 dark:text-white font-bold text-base">
                  Tidak ada jadwal tersisa
                </Text>
                <Text className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Jadwal hari ini akan muncul di sini.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Menu Cepat Section */}
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-4 tracking-tight">
          Aksi Cepat
        </Text>

        <View className="flex-row flex-wrap justify-between mb-8 gap-y-3">
          {quickActions.map((action) => (
            <View className="w-[48%]" key={action.label}>
              <InteractiveCard
                onPress={action.onPress}
                accessibilityLabel={action.accessibilityLabel}
              >
                <View className={`${action.color} rounded-[20px] min-h-[104px] p-4 items-center justify-center border border-white/10`}>
                  <View className="bg-white/20 w-12 h-12 rounded-2xl items-center justify-center mb-3">
                    <Ionicons name={action.icon} size={24} color="white" />
                  </View>
                  <Text className="text-white font-bold text-center text-sm">
                    {action.label}
                  </Text>
                </View>
              </InteractiveCard>
            </View>
          ))}
        </View>

        {/* Progress Tugas Area */}
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-4 tracking-tight">
          Ringkasan Belajar
        </Text>

        <View className="bg-white dark:bg-slate-800 rounded-[24px] p-6 border border-slate-100 dark:border-slate-700 mb-8 overflow-hidden">
          {recentTasks.length === 0 ? (
            <View className="items-center py-6">
              <View className="bg-slate-50 dark:bg-slate-700/50 w-24 h-24 rounded-full items-center justify-center mb-5 border-4 border-white dark:border-slate-800">
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
                onPress={() => navigateWithOpenAdd("Tugas")}
                accessibilityLabel="Buat tugas baru"
                accessibilityHint="Membuka formulir tambah tugas"
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
                    accessibilityLabel={`Buka tugas ${task.task_name}`}
                    accessibilityHint="Buka halaman Tugas"
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
                accessibilityRole="button"
                accessibilityLabel={`Lihat semua tugas, ${stats.activeTasks} tugas aktif`}
                className="mt-2 items-center justify-center min-h-[44px]"
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
