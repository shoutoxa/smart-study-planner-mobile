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
import { useColorScheme } from "nativewind";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    belum: 0,
    selesai: 0,
    terlewat: 0,
  });

  const { colorScheme } = useColorScheme();
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

      // Calculate stats
      let total = tasksData.length;
      let selesai = tasksData.filter((t) => t.status === "Selesai").length;
      let belum = total - selesai;
      let terlewat = 0; // Simple mock for testing, ideally checked against current date

      setStats({ total, belum, selesai, terlewat });

      const coursesData = await fetchAll(
        "SELECT id, course_name FROM courses ORDER BY course_name ASC",
      );
      setCourses(coursesData);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const toggleTaskStatus = async (task) => {
    const newStatus =
      task.status === "Selesai" ? "Belum Dikerjakan" : "Selesai";
    try {
      await executeWrite("UPDATE tasks SET status = ? WHERE id = ?", [
        newStatus,
        task.id,
      ]);
      loadData();
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
          loadData();
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
    setShowPicker(false);
    if (selectedDate) {
      setDateObj(selectedDate);
      setDeadline(formatDate(selectedDate));
    }
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
      loadData();
    } catch (error) {
      console.error("Failed to save task:", error);
      Alert.alert("Error", "Gagal menyimpan tugas");
    }
  };

  const renderTaskItem = ({ item }) => {
    const isCompleted = item.status === "Selesai";

    let priorityBadgeColor =
      "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300";
    let priorityText = "LOW";
    if (item.priority === "Tinggi") {
      priorityBadgeColor =
        "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300";
      priorityText = "HIGH";
    } else if (item.priority === "Sedang") {
      priorityBadgeColor =
        "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300";
      priorityText = "MEDIUM";
    }

    return (
      <View className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-3xl p-5 mb-4 shadow-sm flex-row">
        <TouchableOpacity
          onPress={() => toggleTaskStatus(item)}
          className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-4 mt-1 ${isCompleted ? "bg-emerald-400 border-emerald-400" : "border-slate-300 dark:border-slate-600 bg-transparent"}`}
        >
          {isCompleted && <Ionicons name="checkmark" size={14} color="white" />}
        </TouchableOpacity>

        <View className="flex-1 pr-2">
          <View className="flex-row items-center mb-2">
            {isCompleted ? (
              <View className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded mr-2">
                <Text className="text-[10px] font-bold text-slate-500 uppercase">
                  SELESAI
                </Text>
              </View>
            ) : (
              <View
                className={`${priorityBadgeColor} px-2 py-0.5 rounded-full mr-2`}
              >
                <Text className="text-[10px] font-bold uppercase">
                  {priorityText}
                </Text>
              </View>
            )}
            <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {item.course_name ? item.course_name : "Umum"}
            </Text>
          </View>

          <Text
            className={`text-base font-bold text-slate-800 dark:text-white leading-snug mb-3 ${isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
            numberOfLines={2}
          >
            {item.task_name}
          </Text>

          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              {item.deadline ? (
                <View className="flex-row items-center mr-3">
                  <Ionicons name="calendar-outline" size={13} color="#EF4444" />
                  <Text className="text-rose-500 text-[11px] ml-1 font-medium">
                    {item.deadline}
                  </Text>
                </View>
              ) : null}
              <View className="flex-row items-center">
                <Ionicons name="link-outline" size={14} color="#94A3B8" />
                <Text className="text-slate-500 dark:text-slate-400 text-[11px] ml-1 font-medium">
                  2 file
                </Text>
              </View>
            </View>

            <View className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
              <Text className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                {isCompleted
                  ? "Selesai"
                  : item.status === "Belum Dikerjakan"
                    ? "Belum Dikerjakan"
                    : "In Progress"}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => confirmDelete(item.id)}
          className="p-1 items-start hidden"
        ></TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0F172A]">
      {/* Header SmartStudy top */}
      <View className="px-5 pt-4 pb-2 flex-row justify-between items-center mb-2">
        <View className="flex-row items-center">
          <Ionicons name="school" size={24} color="#3B82F6" />
          <Text className="text-lg font-bold text-slate-800 dark:text-white ml-2">
            SmartStudy
          </Text>
        </View>
        <Ionicons
          name="menu"
          size={24}
          color={isDark ? "#94A3B8" : "#475569"}
        />
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTaskItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Title Section */}
            <View className="mb-4 mt-2">
              <Text className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                Manajemen Tugas
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm">
                Pantau tenggat waktu dan status pengerjaan tugasmu.
              </Text>
            </View>

            {/* Add Button Full Width */}
            <TouchableOpacity
              onPress={openAddModal}
              className="bg-blue-500 rounded-xl py-3.5 mb-6 flex-row items-center justify-center shadow-lg shadow-blue-500/20"
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text className="text-white font-bold text-[15px] ml-2">
                Tambah Tugas
              </Text>
            </TouchableOpacity>

            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between mb-6">
              <View className="bg-white dark:bg-[#1E293B] w-[48%] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                <View className="bg-blue-50 dark:bg-blue-900/30 w-8 h-8 rounded-lg items-center justify-center mb-3">
                  <Ionicons name="clipboard" size={16} color="#3B82F6" />
                </View>
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  Total Tugas
                </Text>
                <Text className="text-2xl font-bold text-slate-800 dark:text-white">
                  {stats.total}
                </Text>
              </View>

              <View className="bg-white dark:bg-[#1E293B] w-[48%] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                <View className="bg-orange-50 dark:bg-orange-900/30 w-8 h-8 rounded-lg items-center justify-center mb-3">
                  <Ionicons name="time" size={16} color="#F97316" />
                </View>
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  Belum Selesai
                </Text>
                <Text className="text-2xl font-bold text-slate-800 dark:text-white">
                  {stats.belum}
                </Text>
              </View>

              <View className="bg-white dark:bg-[#1E293B] w-[48%] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                <View className="bg-emerald-50 dark:bg-emerald-900/30 w-8 h-8 rounded-lg items-center justify-center mb-3">
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                </View>
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  Selesai
                </Text>
                <Text className="text-2xl font-bold text-slate-800 dark:text-white">
                  {stats.selesai}
                </Text>
              </View>

              <View className="bg-white dark:bg-[#1E293B] w-[48%] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                <View className="bg-red-50 dark:bg-red-900/30 w-8 h-8 rounded-lg items-center justify-center mb-3">
                  <Ionicons name="alert-triangle" size={16} color="#EF4444" />
                </View>
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  Terlewat
                </Text>
                <Text className="text-2xl font-bold text-slate-800 dark:text-white">
                  {stats.terlewat}
                </Text>
              </View>
            </View>

            {/* List Header */}
            <View className="flex-row justify-between items-center mb-2 mt-2">
              <Text className="text-lg font-bold text-slate-800 dark:text-white">
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
                  className={`px-4 flex justify-center items-center rounded-xl border mr-2 h-11 ${
                    courseId === ""
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500"
                      : "bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <Text
                    className={
                      courseId === ""
                        ? "text-blue-700 dark:text-blue-400 font-bold"
                        : "text-slate-600 dark:text-slate-400"
                    }
                  >
                    Umum / Tanpa MK
                  </Text>
                </TouchableOpacity>
                {courses.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCourseId(c.id)}
                    className={`px-4 flex justify-center items-center rounded-xl border mr-2 h-11 ${
                      courseId === c.id
                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500"
                        : "bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <Text
                      className={
                        courseId === c.id
                          ? "text-blue-700 dark:text-blue-400 font-bold"
                          : "text-slate-600 dark:text-slate-400"
                      }
                    >
                      {c.course_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Deadline / Tenggat Waktu
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-slate-800 dark:text-white mb-6"
                placeholder="Contoh: 12 Nov 2024"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={deadline}
                onChangeText={setDeadline}
              />

              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Prioritas
              </Text>
              <View className="flex-row justify-between mb-10 mt-2">
                {["Rendah", "Sedang", "Tinggi"].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    className={`flex-1 py-3 items-center border-b-2 justify-center ${
                      priority === p
                        ? "border-blue-500"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        priority === p
                          ? "text-blue-500 dark:text-blue-400"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
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
