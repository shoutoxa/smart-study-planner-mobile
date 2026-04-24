import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { fetchAll, executeWrite } from "../database/dbHelper";
import { useColorScheme } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import InteractiveCard from "../components/InteractiveCard";

export default function SchedulesScreen() {
  const [schedules, setSchedules] = useState({});
  const [courses, setCourses] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);

  const daysOfWeek = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
  ];

  // Form State
  const [courseId, setCourseId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Senin");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");
  const [classType, setClassType] = useState("Teori");

  // Time Picker State
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startTimeObj, setStartTimeObj] = useState(new Date());
  const [endTimeObj, setEndTimeObj] = useState(new Date());

  const loadData = async () => {
    try {
      const scheduleData = await fetchAll(
        `SELECT cs.*, c.course_name, c.lecturer_name 
         FROM class_schedules cs 
         JOIN courses c ON cs.course_id = c.id 
         ORDER BY 
          CASE cs.day_of_week 
            WHEN 'Senin' THEN 1 
            WHEN 'Selasa' THEN 2 
            WHEN 'Rabu' THEN 3 
            WHEN 'Kamis' THEN 4 
            WHEN 'Jumat' THEN 5 
            WHEN 'Sabtu' THEN 6 
            WHEN 'Minggu' THEN 7 
          END, 
          cs.start_time ASC`,
      );

      const grouped = {};
      daysOfWeek.forEach((day) => {
        grouped[day] = [];
      });
      scheduleData.forEach((item) => {
        if (grouped[item.day_of_week]) {
          grouped[item.day_of_week].push(item);
        } else {
          grouped[item.day_of_week] = [item];
        }
      });
      setSchedules(grouped);

      const coursesData = await fetchAll(
        "SELECT id, course_name FROM courses ORDER BY course_name ASC",
      );
      setCourses(coursesData);
    } catch (error) {
      console.error("Failed to load schedules:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const parseTimeStr = (timeStr) => {
    if (!timeStr) return new Date();
    const [hours, minutes] = timeStr.split(":");
    const d = new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d;
  };

  const openAddModal = () => {
    setEditingSchedule(null);
    setCourseId("");
    setDayOfWeek("Senin");
    setStartTime("");
    setEndTime("");
    setStartTimeObj(new Date());
    setEndTimeObj(new Date());
    setRoom("");
    setClassType("Teori");
    setModalVisible(true);
  };

  const openEditModal = (schedule) => {
    setEditingSchedule(schedule);
    setCourseId(schedule.course_id);
    setDayOfWeek(schedule.day_of_week);
    setStartTime(schedule.start_time);
    setEndTime(schedule.end_time);
    setStartTimeObj(parseTimeStr(schedule.start_time));
    setEndTimeObj(parseTimeStr(schedule.end_time));
    setRoom(schedule.room || "");
    setClassType(schedule.class_type || "Teori");
    setModalVisible(true);
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const onStartTimeChange = (event, selectedTime) => {
    setShowStartPicker(false);
    if (selectedTime) {
      setStartTimeObj(selectedTime);
      setStartTime(formatTime(selectedTime));
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    setShowEndPicker(false);
    if (selectedTime) {
      setEndTimeObj(selectedTime);
      setEndTime(formatTime(selectedTime));
    }
  };

  const saveSchedule = async () => {
    if (!courseId || !startTime || !endTime) {
      Alert.alert(
        "Error",
        "Mata kuliah, jam mulai, dan jam selesai wajib diisi",
      );
      return;
    }

    try {
      if (editingSchedule) {
        await executeWrite(
          "UPDATE class_schedules SET course_id=?, day_of_week=?, start_time=?, end_time=?, room=?, class_type=? WHERE id=?",
          [
            courseId,
            dayOfWeek,
            startTime,
            endTime,
            room,
            classType,
            editingSchedule.id,
          ],
        );
      } else {
        await executeWrite(
          "INSERT INTO class_schedules (course_id, day_of_week, start_time, end_time, room, class_type) VALUES (?, ?, ?, ?, ?, ?)",
          [courseId, dayOfWeek, startTime, endTime, room, classType],
        );
      }
      setModalVisible(false);
      await loadData();
    } catch (error) {
      console.error("Failed to save schedule:", error);
      Alert.alert("Error", "Gagal menyimpan jadwal");
    }
  };

  const confirmDelete = (id) => {
    Alert.alert("Hapus Jadwal", "Apakah Anda yakin?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await executeWrite("DELETE FROM class_schedules WHERE id = ?", [id]);
            await loadData();
          } catch (error) {
            console.error("Failed to delete schedule:", error);
            Alert.alert("Error", "Gagal menghapus jadwal.");
          }
        },
      },
    ]);
  };

  const renderGroupedSchedules = useCallback(() => {
    return daysOfWeek.map((day) => {
      const daySchedules = schedules[day];
      if (!daySchedules || daySchedules.length === 0) return null;

      return (
        <View key={day} className="mb-8">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl items-center justify-center mr-3 border border-indigo-200 dark:border-indigo-800">
              <Ionicons name="calendar" size={18} color="#4F46E5" />
            </View>
            <Text className="text-xl font-bold font-serif text-[#1a365d] dark:text-white flex-1">
              {day}
            </Text>
            <View className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              <Text className="text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-widest">
                {daySchedules.length} Sesi
              </Text>
            </View>
          </View>

          {daySchedules.map((item, index) => (
            <View key={item.id} className="mb-4">
              <InteractiveCard>
                <View className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 flex-row">
                  <View className="items-center justify-center w-16 mr-4 pr-4 border-r border-slate-100 dark:border-slate-700">
                    <Text className="text-slate-800 dark:text-white font-bold text-base leading-none text-center">
                      {item.start_time}
                    </Text>
                    <Text className="text-emerald-500 dark:text-emerald-400 text-[9px] my-1 font-bold uppercase tracking-widest text-center">
                      sampai
                    </Text>
                    <Text className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-none text-center">
                      {item.end_time}
                    </Text>
                  </View>

                  <View className="flex-1 justify-center">
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-[17px] font-bold text-slate-800 dark:text-slate-100 flex-1 pr-2 leading-snug">
                        {item.course_name}
                      </Text>
                      <View className="flex-row -mt-1 -mr-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <TouchableOpacity
                          onPress={() => openEditModal(item)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          className="p-2"
                        >
                          <Ionicons
                            name="pencil"
                            size={16}
                            color={isDark ? "#94A3B8" : "#64748B"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => confirmDelete(item.id)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          className="p-2"
                        >
                          <Ionicons name="trash" size={16} color="#F43F5E" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="flex-row flex-wrap gap-2">
                      <View className="flex-row items-center bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-2 py-1 rounded-md">
                        <Ionicons name="business" size={12} color="#4F46E5" />
                        <Text className="text-indigo-600 dark:text-indigo-400 text-[11px] ml-1.5 font-bold">
                          {item.room || "Ruang TBA"}
                        </Text>
                      </View>
                      <View className="flex-row items-center bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 px-2 py-1 rounded-md">
                        <Ionicons name="person" size={12} color="#64748B" />
                        <Text
                          className="text-slate-600 dark:text-slate-300 text-[11px] ml-1.5 font-medium flex-shrink"
                          numberOfLines={1}
                        >
                          {item.lecturer_name || "Tanpa Dosen"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </InteractiveCard>
            </View>
          ))}
        </View>
      );
    });
  }, [schedules, isDark, confirmDelete, openEditModal]);

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="pt-2"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData().then(() => setRefreshing(false));
            }}
            tintColor={isDark ? "#cbd5e1" : "#475569"}
          />
        }
      >
        {/* Title and Add Button */}
        <View className="px-5 mb-5 mt-4 flex-row justify-between items-end">
          <View className="flex-1 pr-2">
            <Text className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 mb-1 tracking-widest uppercase">
              Kalender
            </Text>
            <Text className="text-3xl font-serif font-bold text-[#1a365d] dark:text-white mb-2 tracking-tight">
              Jadwal Kuliah
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
              Kelola jadwal perkuliahan rutin setiap harinya.
            </Text>
          </View>
        </View>

        <View className="px-5 mb-8">
          <InteractiveCard onPress={openAddModal}>
            <View className="bg-indigo-600 dark:bg-indigo-500 rounded-[24px] py-4 flex-row items-center justify-center shadow-md shadow-indigo-500/20">
              <Ionicons name="add-circle" size={22} color="white" />
              <Text className="text-white font-bold text-[16px] ml-2 tracking-wide">
                Tambah Sesi Kuliah
              </Text>
            </View>
          </InteractiveCard>
        </View>

        {/* List of Schedules */}
        <View className="px-5">
          {Object.keys(schedules).some((day) => schedules[day]?.length > 0) ? (
            renderGroupedSchedules()
          ) : (
            <View className="flex-1 items-center justify-center py-20 mt-10">
              <View className="mb-4">
                <Ionicons
                  name="calendar-outline"
                  size={80}
                  color={isDark ? "#334155" : "#CBD5E1"}
                />
              </View>
              <Text className="text-slate-800 dark:text-white text-lg font-bold pb-1">
                Belum Ada Jadwal
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center mt-1">
                Ketuk tombol + di atas untuk menambahkan jadwal.
              </Text>
            </View>
          )}
          <View className="h-24" />
        </View>
      </ScrollView>

      {/* Modal Add/Edit */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-slate-900/60">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="bg-white dark:bg-[#0F172A] rounded-t-3xl pt-2 pb-8 px-6 h-[90%]"
          >
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2" />
            </View>

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-800 dark:text-white">
                {editingSchedule ? "Edit Jadwal" : "Tambah Jadwal"}
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
                Pilih Mata Kuliah *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4 h-12"
              >
                {courses.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCourseId(c.id)}
                    className="px-4 py-3 rounded-xl border mr-2 h-11 justify-center align-middle"
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
                {courses.length === 0 && (
                  <Text className="text-slate-400 py-2">
                    Tambahkan mata kuliah terlebih dahulu.
                  </Text>
                )}
              </ScrollView>

              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 mt-4">
                Hari *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-6 h-12"
              >
                {daysOfWeek.map((day) => (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setDayOfWeek(day)}
                    className="px-4 flex justify-center items-center rounded-xl border mr-2 h-11"
                    style={{
                      backgroundColor:
                        dayOfWeek === day
                          ? isDark
                            ? "rgba(30, 58, 138, 0.3)"
                            : "#eff6ff"
                          : isDark
                            ? "#1E293B"
                            : "#ffffff",
                      borderColor:
                        dayOfWeek === day
                          ? "#3b82f6"
                          : isDark
                            ? "#1e293b"
                            : "#e2e8f0",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          dayOfWeek === day
                            ? isDark
                              ? "#60a5fa"
                              : "#1d4ed8"
                            : isDark
                              ? "#94a3b8"
                              : "#475569",
                        fontWeight: dayOfWeek === day ? "bold" : "normal",
                      }}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View className="flex-row justify-between mb-6">
                <View className="w-[48%]">
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Jam Mulai *
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowStartPicker(true)}
                    className="bg-slate-50 flex-row justify-between items-center dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4"
                  >
                    <Text
                      style={{
                        color: startTime
                          ? isDark
                            ? "#ffffff"
                            : "#1e293b"
                          : isDark
                            ? "#64748b"
                            : "#94a3b8",
                      }}
                    >
                      {startTime ? startTime : "00:00"}
                    </Text>
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={isDark ? "#64748B" : "#94A3B8"}
                    />
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={startTimeObj}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onChange={onStartTimeChange}
                    />
                  )}
                </View>
                <View className="w-[48%]">
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Jam Selesai *
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowEndPicker(true)}
                    className="bg-slate-50 flex-row justify-between items-center dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4"
                  >
                    <Text
                      style={{
                        color: endTime
                          ? isDark
                            ? "#ffffff"
                            : "#1e293b"
                          : isDark
                            ? "#64748b"
                            : "#94a3b8",
                      }}
                    >
                      {endTime ? endTime : "00:00"}
                    </Text>
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={isDark ? "#64748B" : "#94A3B8"}
                    />
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePicker
                      value={endTimeObj}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onChange={onEndTimeChange}
                    />
                  )}
                </View>
              </View>

              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Ruangan
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-slate-800 dark:text-white mb-6"
                placeholder="Lab Komputer A"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={room}
                onChangeText={setRoom}
              />

              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Jenis Kelas
              </Text>
              <View className="flex-row mb-10 mt-2">
                {["Teori", "Praktikum"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setClassType(type)}
                    className="flex-1 py-3 items-center border-b-2 justify-center"
                    style={{
                      borderColor:
                        classType === type
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
                          classType === type
                            ? isDark
                              ? "#60a5fa"
                              : "#3b82f6"
                            : isDark
                              ? "#64748b"
                              : "#94a3b8",
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={saveSchedule}
                className="bg-blue-500 rounded-2xl py-4 items-center shadow-lg shadow-blue-500/30 dark:shadow-none"
              >
                <Text className="text-white font-bold text-base">
                  Simpan Jadwal
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
