import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { fetchAll, executeWrite } from "../database/dbHelper";
import { useColorScheme } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import InteractiveCard from "../components/InteractiveCard";
import * as Notifications from "expo-notifications";

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Stats Calculated on the fly (react-best-practices: rerender-derived-state)
  const totalTasks = tasks.length;
  const selesaiTasks = tasks.filter((t) => t.status === "Selesai").length;
  const belumTasks = totalTasks - selesaiTasks;
  const terlewatTasks = 0; // Simple mock for testing

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Form State
  const [taskName, setTaskName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Sedang");

  // Date Picker State
  const [showPicker, setShowPicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());

  const loadData = async () => {
    try {
      let query = `
        SELECT t.*, c.course_name 
        FROM tasks t 
        LEFT JOIN courses c ON t.course_id = c.id 
        ORDER BY t.status DESC, t.deadline ASC
      `;

      const tasksData = await fetchAll(query);
      setTasks(tasksData);

      const coursesData = await fetchAll(
        "SELECT id, course_name FROM courses ORDER BY course_name ASC",
      );
      setCourses(coursesData);

      // Sinkronisasi Jadwal Notifikasi Push Lokal secara Latar Belakang (Non-blocking)
      syncNotifications(tasksData).catch(console.error);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  };

  const syncNotifications = async (tasksData) => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      for (const t of tasksData) {
        if (t.status === "Belum Dikerjakan" && t.deadline) {
          const parts = t.deadline.split(" ");
          if (parts.length === 2) {
            const dateParts = parts[0].split("/");
            const timeParts = parts[1].split(":");
            if (dateParts.length === 3 && timeParts.length === 2) {
              const taskDate = new Date(
                parseInt(dateParts[2], 10),
                parseInt(dateParts[1], 10) - 1,
                parseInt(dateParts[0], 10),
                parseInt(timeParts[0], 10),
                parseInt(timeParts[1], 10),
              );

              const now = new Date();

              const notifyTime1H = new Date(
                taskDate.getTime() - 60 * 60 * 1000,
              );
              if (notifyTime1H > now) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "⏰ Pengingat Deadline",
                    body: `${t.task_name} harus segera diselesaikan dalam 1 jam!`,
                    sound: true,
                  },
                  trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: notifyTime1H,
                  },
                });
              }

              const notifyTime24H = new Date(
                taskDate.getTime() - 24 * 60 * 60 * 1000,
              );
              if (notifyTime24H > now) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "📅 Pengingat H-1 Tugas",
                    body: `Jangan lupa kerjakan tugas: ${t.task_name}`,
                    sound: true,
                  },
                  trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: notifyTime24H,
                  },
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to sync notifications:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const toggleTaskStatus = async (task) => {
    const newStatus =
      task.status === "Selesai" ? "Belum Dikerjakan" : "Selesai";
    try {
      await executeWrite("UPDATE tasks SET status = ? WHERE id = ?", [
        newStatus,
        task.id,
      ]);
      // Beri waktu SQLite melepas lock sebelum membaca ulang
      setTimeout(() => loadData(), 100);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const confirmDelete = (id) => {
    Alert.alert("Hapus Tugas", "Apakah Anda yakin ingin menghapus tugas ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await executeWrite("DELETE FROM tasks WHERE id = ?", [id]);
          setTimeout(() => loadData(), 100);
        },
      },
    ]);
  };

  const openAddModal = () => {
    setEditingTask(null);
    setTaskName("");
    setCourseId("");
    setDeadline("");
    setDateObj(new Date());
    setPriority("Sedang");
    setModalVisible(true);
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const onDateChange = (event, selectedDate) => {
    // Handling seragam utk pengingkaran picker
    if (Platform.OS === "ios") {
      setShowPicker(false);
    }

    // Tipe "set" menandakan pengguna menekan OK
    if (event.type === "set" && selectedDate) {
      setDateObj(selectedDate);
      // Format 24 Jam khusus tugas:
      setDeadline(formatDate(selectedDate));
    }
  };

  const showAndroidDatePicker = () => {
    DateTimePickerAndroid.open({
      value: dateObj || new Date(),
      onChange: (event, date) => {
        // Tangkap hasil pemilihan tanggal (DatePicker) dulu
        if (event.type === "set" && date) {
          const currentSelectedDate = date;
          // Segera panggil TimePicker untuk jamnya!
          DateTimePickerAndroid.open({
            value: currentSelectedDate,
            mode: "time",
            is24Hour: true,
            onChange: (timeEvent, timeDate) => {
              if (timeEvent.type === "set" && timeDate) {
                const finalDate = new Date(
                  currentSelectedDate.getFullYear(),
                  currentSelectedDate.getMonth(),
                  currentSelectedDate.getDate(),
                  timeDate.getHours(),
                  timeDate.getMinutes(),
                );
                setDateObj(finalDate);
                setDeadline(formatDate(finalDate));
              }
            },
          });
        }
      },
      mode: "date",
      is24Hour: true,
    });
  };

  const saveTask = async () => {
    if (!taskName.trim()) {
      Alert.alert("Error", "Nama tugas tidak boleh kosong");
      return;
    }

    try {
      if (editingTask) {
        await executeWrite(
          "UPDATE tasks SET course_id=?, task_name=?, deadline=?, priority=? WHERE id=?",
          [courseId || null, taskName, deadline, priority, editingTask.id],
        );
      } else {
        await executeWrite(
          "INSERT INTO tasks (course_id, task_name, deadline, priority, status) VALUES (?, ?, ?, ?, ?)",
          [courseId || null, taskName, deadline, priority, "Belum Dikerjakan"],
        );
      }
      setModalVisible(false);
      // Beri napas bagi SQLite sebelum merekam tabel kembali
      setTimeout(() => loadData(), 100);
    } catch (error) {
      console.error("Failed to save task:", error);
      Alert.alert("Error", "Gagal menyimpan tugas");
    }
  };

  const renderTaskItem = useCallback(({ item }) => {
    const isCompleted = item.status === "Selesai";

    let priorityStyles = {
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff", // blue-50 : blue-500/10
      color: isDark ? "#60A5FA" : "#3b82f6", // blue-400 : blue-500
    };
    let priorityText = "Rendah";

    if (item.priority === "Tinggi") {
      priorityStyles = {
        backgroundColor: isDark ? "rgba(244, 63, 94, 0.15)" : "#fff1f2", // rose-50 : rose-500/10
        color: isDark ? "#FB7185" : "#f43f5e", // rose-400 : rose-500
      };
      priorityText = "Tinggi";
    } else if (item.priority === "Sedang") {
      priorityStyles = {
        backgroundColor: isDark ? "rgba(249, 115, 22, 0.15)" : "#fff7ed", // orange-50 : orange-500/10
        color: isDark ? "#FB923C" : "#f97316", // orange-400 : orange-500
      };
      priorityText = "Sedang";
    }

    return (
      <View className="mb-4">
        <InteractiveCard>
          <View className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 flex-row">
            <TouchableOpacity
              onPress={() => toggleTaskStatus(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-7 h-7 rounded-[10px] items-center justify-center mr-4 mt-1 shadow-sm border"
              style={{
                backgroundColor: isCompleted
                  ? "#10b981"
                  : isDark
                    ? "#334155"
                    : "#f1f5f9",
                borderColor: isCompleted
                  ? "transparent"
                  : isDark
                    ? "#475569"
                    : "#e2e8f0",
                shadowColor: isCompleted ? "#10b981" : "transparent",
              }}
            >
              {isCompleted && (
                <Ionicons name="checkmark" size={18} color="white" />
              )}
            </TouchableOpacity>

            <View className="flex-1 pr-2">
              <View className="flex-row items-center mb-2">
                {isCompleted ? (
                  <View className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded mr-2">
                    <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                      SELESAI
                    </Text>
                  </View>
                ) : (
                  <View
                    className="px-2 py-0.5 rounded mr-2 border border-slate-200/50 dark:border-transparent"
                    style={{ backgroundColor: priorityStyles.backgroundColor }}
                  >
                    <Text
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: priorityStyles.color }}
                    >
                      {priorityText}
                    </Text>
                  </View>
                )}
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {item.course_name ? item.course_name : "Umum"}
                </Text>
              </View>

              <Text
                className="text-[17px] font-bold leading-snug mb-3 tracking-snug"
                style={{
                  color: isCompleted
                    ? isDark
                      ? "#64748b"
                      : "#94a3b8"
                    : isDark
                      ? "#f1f5f9"
                      : "#1e293b",
                  textDecorationLine: isCompleted ? "line-through" : "none",
                }}
                numberOfLines={2}
              >
                {item.task_name}
              </Text>

              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  {item.deadline ? (
                    <View className="flex-row items-center mr-3 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-full">
                      <Ionicons name="time" size={13} color="#F43F5E" />
                      <Text className="text-rose-600 dark:text-rose-400 text-[11px] ml-1.5 font-bold">
                        {item.deadline}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity onPress={() => confirmDelete(item.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </InteractiveCard>
      </View>
    );
  }, [isDark, confirmDelete, toggleTaskStatus]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0F172A]">
      {/* Header SmartStudy top */}
      <View className="px-6 pt-6 pb-2 flex-row justify-between items-center mb-2">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl items-center justify-center mr-3">
            <Ionicons name="school" size={20} color="#4F46E5" />
          </View>
          <Text className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            SmartStudy
          </Text>
        </View>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTaskItem}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 150,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Title Section */}
            <View className="mb-5 mt-4">
              <Text className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 mb-1 tracking-widest uppercase">
                Produktivitas
              </Text>
              <Text className="text-3xl font-serif font-bold text-[#1a365d] dark:text-white mb-2 tracking-tight">
                Manajemen Tugas
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm">
                Pantau tenggat waktu dan status tugasmu.
              </Text>
            </View>

            {/* Add Button Full Width */}
            <View className="mb-8">
              <InteractiveCard onPress={openAddModal}>
                <View className="bg-indigo-600 dark:bg-indigo-500 rounded-[24px] py-4 flex-row items-center justify-center shadow-md shadow-indigo-500/20">
                  <Ionicons name="add-circle" size={22} color="white" />
                  <Text className="text-white font-bold text-[16px] ml-2 tracking-wide">
                    Tambah Tugas Baru
                  </Text>
                </View>
              </InteractiveCard>
            </View>

            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between mb-8 gap-y-4">
              <View className="w-[48%]">
                <InteractiveCard>
                  <View className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                    <View className="bg-blue-50 dark:bg-blue-900/30 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                      <Ionicons name="albums" size={20} color="#3B82F6" />
                    </View>
                    <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-widest">
                      TOTAL
                    </Text>
                    <Text className="text-3xl font-serif font-bold text-slate-800 dark:text-white">
                      {totalTasks}
                    </Text>
                  </View>
                </InteractiveCard>
              </View>

              <View className="w-[48%]">
                <InteractiveCard>
                  <View className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                    <View className="bg-indigo-50 dark:bg-indigo-900/30 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                      <Ionicons name="time" size={20} color="#6366F1" />
                    </View>
                    <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-widest">
                      BELUM
                    </Text>
                    <Text className="text-3xl font-serif font-bold text-slate-800 dark:text-white">
                      {belumTasks}
                    </Text>
                  </View>
                </InteractiveCard>
              </View>

              <View className="w-[48%]">
                <InteractiveCard>
                  <View className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                    <View className="bg-emerald-50 dark:bg-emerald-900/30 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10B981"
                      />
                    </View>
                    <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-widest">
                      SELESAI
                    </Text>
                    <Text className="text-3xl font-serif font-bold text-slate-800 dark:text-white">
                      {selesaiTasks}
                    </Text>
                  </View>
                </InteractiveCard>
              </View>

              <View className="w-[48%]">
                <InteractiveCard>
                  <View className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                    <View className="bg-rose-50 dark:bg-rose-900/30 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                      <Ionicons name="alert-circle" size={20} color="#F43F5E" />
                    </View>
                    <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-widest">
                      TERLEWAT
                    </Text>
                    <Text className="text-3xl font-serif font-bold text-slate-800 dark:text-white">
                      {terlewatTasks}
                    </Text>
                  </View>
                </InteractiveCard>
              </View>
            </View>

            {/* List Header */}
            <View className="flex-row justify-between items-center mb-4 mt-2">
              <Text className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                Daftar Tugas
              </Text>
            </View>
          </>
        }
        ListFooterComponent={
          tasks.length > 0 ? (
            <TouchableOpacity className="mt-6 mb-10 py-3 items-center">
              <Text className="text-blue-500 font-medium text-sm">
                Lihat Semua Tugas
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View className="py-20 flex items-center justify-center">
            <Ionicons
              name="checkbox-outline"
              size={60}
              color={isDark ? "#334155" : "#CBD5E1"}
              className="mb-4"
            />
            <Text className="text-slate-500 dark:text-slate-400 font-medium">
              Yeay, Belum ada tugas!
            </Text>
          </View>
        }
      />

      {/* Modal Add Task */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-slate-900/60">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="bg-white dark:bg-[#0F172A] rounded-t-3xl pt-2 pb-8 px-6 h-[85%]"
          >
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2" />
            </View>

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-800 dark:text-white">
                {editingTask ? "Edit Tugas" : "Tambah Tugas"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
              >
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 mt-2">
                Nama Tugas *
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-slate-800 dark:text-white mb-6"
                placeholder="Contoh: Membuat Makalah"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={taskName}
                onChangeText={setTaskName}
              />

              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Pilih Mata Kuliah
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-6 h-12"
              >
                <TouchableOpacity
                  onPress={() => setCourseId("")}
                  className="px-4 flex justify-center items-center rounded-xl border mr-2 h-11"
                  style={{
                    backgroundColor:
                      courseId === ""
                        ? isDark
                          ? "rgba(30, 58, 138, 0.3)"
                          : "#eff6ff"
                        : isDark
                          ? "#1E293B"
                          : "#ffffff",
                    borderColor:
                      courseId === ""
                        ? "#3b82f6"
                        : isDark
                          ? "#1e293b"
                          : "#e2e8f0",
                  }}
                >
                  <Text
                    style={{
                      color:
                        courseId === ""
                          ? isDark
                            ? "#60a5fa"
                            : "#1d4ed8"
                          : isDark
                            ? "#94a3b8"
                            : "#475569",
                      fontWeight: courseId === "" ? "bold" : "normal",
                    }}
                  >
                    Umum / Tanpa MK
                  </Text>
                </TouchableOpacity>
                {courses.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCourseId(c.id)}
                    className="px-4 flex justify-center items-center rounded-xl border mr-2 h-11"
                    style={{
                      backgroundColor:
                        courseId === c.id
                          ? isDark
                            ? "rgba(30, 58, 138, 0.3)"
                            : "#eff6ff"
                          : isDark
                            ? "#1E293B"
                            : "#ffffff",
                      borderColor:
                        courseId === c.id
                          ? "#3b82f6"
                          : isDark
                            ? "#1e293b"
                            : "#e2e8f0",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          courseId === c.id
                            ? isDark
                              ? "#60a5fa"
                              : "#1d4ed8"
                            : isDark
                              ? "#94a3b8"
                              : "#475569",
                        fontWeight: courseId === c.id ? "bold" : "normal",
                      }}
                    >
                      {c.course_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Deadline / Tenggat Waktu
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === "android") {
                    showAndroidDatePicker();
                  } else {
                    setShowPicker(true);
                  }
                }}
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 mb-6 flex-row justify-between items-center"
              >
                <Text
                  className={
                    deadline
                      ? "text-slate-800 dark:text-white"
                      : "text-slate-400"
                  }
                >
                  {deadline || "Pilih Waktu (Contoh: 12/11/2024 10:00)"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#94A3B8" />
              </TouchableOpacity>

              {/* KHUSUS iOS: Munculkan Komponen di dalam Render JSX */}
              {Platform.OS === "ios" && showPicker && (
                <DateTimePicker
                  value={dateObj || new Date()}
                  mode="datetime"
                  display="default"
                  onChange={onDateChange}
                />
              )}

              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Prioritas
              </Text>
              <View className="flex-row justify-between mb-10 mt-2">
                {["Rendah", "Sedang", "Tinggi"].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    className="flex-1 py-3 items-center border-b-2 justify-center"
                    style={{
                      borderBottomColor:
                        priority === p
                          ? "#3b82f6"
                          : isDark
                            ? "#1e293b"
                            : "#e2e8f0",
                    }}
                  >
                    <Text
                      className="font-bold"
                      style={{
                        color:
                          priority === p
                            ? isDark
                              ? "#60a5fa"
                              : "#3b82f6"
                            : isDark
                              ? "#64748b"
                              : "#94a3b8",
                      }}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={saveTask}
                className="bg-blue-500 rounded-2xl py-4 items-center shadow-lg shadow-blue-500/30 dark:shadow-none"
              >
                <Text className="text-white font-bold text-base">
                  Simpan Tugas
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
