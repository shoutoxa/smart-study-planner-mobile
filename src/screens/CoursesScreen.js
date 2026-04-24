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
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { fetchAll, executeWrite } from "../database/dbHelper";
import { useColorScheme } from "react-native";
import InteractiveCard from "../components/InteractiveCard";

export default function CoursesScreen() {
  const [courses, setCourses] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [courseName, setCourseName] = useState("");
  const [credits, setCredits] = useState("");
  const [lecturer, setLecturer] = useState("");
  const [semester, setSemester] = useState("");
  const [maxAbsences, setMaxAbsences] = useState("3");

  const updateAbsence = async (id, currentCount, max, increment) => {
    let newCount = currentCount;
    if (increment && currentCount < max) newCount++;
    else if (!increment && currentCount > 0) newCount--;

    if (newCount !== currentCount) {
      try {
        await executeWrite("UPDATE courses SET absent_count = ? WHERE id = ?", [
          newCount,
          id,
        ]);
        await loadCourses();
      } catch (error) {
        console.error("Failed to update absence:", error);
        Alert.alert("Error", "Gagal memperbarui data absensi.");
      }
    }
  };

  const loadCourses = async () => {
    try {
      const data = await fetchAll(
        "SELECT * FROM courses ORDER BY course_name ASC",
      );
      setCourses(data);
    } catch (error) {
      console.error("Failed to load courses:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCourses();
    }, []),
  );

  const openAddModal = () => {
    setEditingCourse(null);
    setCourseName("");
    setCredits("");
    setLecturer("");
    setSemester("");
    setMaxAbsences("3");
    setModalVisible(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setCourseName(course.course_name);
    setCredits(course.credits ? course.credits.toString() : "");
    setLecturer(course.lecturer_name || "");
    setSemester(course.semester ? course.semester.toString() : "");
    setMaxAbsences(course.max_absences ? course.max_absences.toString() : "3");
    setModalVisible(true);
  };

  const saveCourse = async () => {
    if (!courseName.trim()) {
      Alert.alert("Error", "Nama mata kuliah tidak boleh kosong");
      return;
    }

    try {
      if (editingCourse) {
        // Update
        await executeWrite(
          "UPDATE courses SET course_name = ?, credits = ?, lecturer_name = ?, semester = ?, max_absences = ? WHERE id = ?",
          [
            courseName,
            parseInt(credits) || 0,
            lecturer,
            parseInt(semester) || 0,
            parseInt(maxAbsences) || 3,
            editingCourse.id,
          ],
        );
      } else {
        // Insert
        await executeWrite(
          "INSERT INTO courses (course_name, credits, lecturer_name, semester, max_absences) VALUES (?, ?, ?, ?, ?)",
          [
            courseName,
            parseInt(credits) || 0,
            lecturer,
            parseInt(semester) || 0,
            parseInt(maxAbsences) || 3,
          ],
        );
      }
      setModalVisible(false);
      await loadCourses();
    } catch (error) {
      console.error("Failed to save course:", error);
      Alert.alert("Error", "Gagal menyimpan mata kuliah");
    }
  };

  const confirmDelete = (id) => {
    Alert.alert(
      "Hapus Mata Kuliah",
      "Apakah Anda yakin? Semua tugas dan jadwal terkait mata kuliah ini juga akan terhapus.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await executeWrite("DELETE FROM courses WHERE id = ?", [id]);
              await loadCourses();
            } catch (error) {
              console.error("Failed to delete course:", error);
              Alert.alert("Error", "Gagal menghapus mata kuliah.");
            }
          },
        },
      ],
    );
  };

  const renderCourseItem = useCallback(({ item }) => {
    const iconStyle = [
      { bgDark: "rgba(30, 58, 138, 0.3)", bgLight: "#dbeafe" }, // blue
      { bgDark: "rgba(88, 28, 135, 0.3)", bgLight: "#f3e8ff" }, // purple
      { bgDark: "rgba(6, 78, 59, 0.3)", bgLight: "#d1fae5" }, // emerald
      { bgDark: "rgba(124, 45, 18, 0.3)", bgLight: "#ffedd5" }, // orange
    ];
    const colorHex = ["#3B82F6", "#A855F7", "#10B981", "#F97316"];
    const icons = [
      "book",
      "cloud-outline",
      "grid-outline",
      "shield-half-outline",
    ];
    const idx = (item.id || 0) % 4;

    return (
      <View className="mb-4 px-5">
        <InteractiveCard>
          <View className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
            <View className="flex-row justify-between items-center mb-4">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor: isDark
                    ? iconStyle[idx].bgDark
                    : iconStyle[idx].bgLight,
                }}
              >
                <Ionicons
                  name={icons[idx]}
                  size={24}
                  color={isDark ? colorHex[idx] : colorHex[idx]}
                />
              </View>
              <View className="bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
                <Text className="text-slate-600 dark:text-slate-300 font-bold text-xs">
                  {item.credits} SKS
                </Text>
              </View>
            </View>

            <Text className="text-xl font-bold font-serif text-slate-800 dark:text-white mb-4">
              {item.course_name}
            </Text>

            <View className="flex-row items-center mb-2">
              <View className="w-6 items-center">
                <Ionicons name="person" size={14} color="#64748B" />
              </View>
              <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                {item.lecturer_name || "Tanpa Dosen"}
              </Text>
            </View>
            <View className="flex-row items-center mb-5">
              <View className="w-6 items-center">
                <Ionicons name="calendar" size={14} color="#64748B" />
              </View>
              <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Semester {item.semester}
              </Text>
            </View>

            {/* Attendance Tracker Bar */}
            <View className="mb-5 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-600">
              <View className="flex-row justify-between items-center mb-3">
                <View>
                  <Text className="text-slate-700 dark:text-slate-300 font-bold text-[13px] uppercase tracking-wider mb-1">
                    Jatah Bolos
                  </Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-xs">
                    {(item.max_absences || 3) - (item.absent_count || 0)} sisa
                    slot libur
                  </Text>
                </View>
                <View className="flex-row items-center bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
                  <TouchableOpacity
                    onPress={() =>
                      updateAbsence(
                        item.id,
                        item.absent_count || 0,
                        item.max_absences || 3,
                        false,
                      )
                    }
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 items-center justify-center active:bg-slate-200 dark:active:bg-slate-600"
                  >
                    <Ionicons
                      name="remove"
                      size={16}
                      color={isDark ? "#E2E8F0" : "#475569"}
                    />
                  </TouchableOpacity>
                  <View className="mx-2 items-center min-w-[30px]">
                    <Text className="text-lg font-bold text-slate-800 dark:text-white leading-none">
                      {item.absent_count || 0}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      updateAbsence(
                        item.id,
                        item.absent_count || 0,
                        item.max_absences || 3,
                        true,
                      )
                    }
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 items-center justify-center active:bg-slate-200 dark:active:bg-slate-600"
                  >
                    <Ionicons
                      name="add"
                      size={16}
                      color={isDark ? "#E2E8F0" : "#475569"}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Progress Bar Container */}
              <View className="h-2 w-full bg-slate-200 dark:bg-slate-600/50 rounded-full overflow-hidden">
                <View
                  style={{
                    width: `${Math.min(((item.absent_count || 0) / (item.max_absences || 3)) * 100, 100)}%`,
                  }}
                  className={`h-full rounded-full ${(item.absent_count || 0) >= (item.max_absences || 3) ? "bg-rose-500" : (item.absent_count || 0) >= (item.max_absences || 3) - 1 ? "bg-amber-400" : "bg-emerald-500"}`}
                />
              </View>
            </View>

            <View className="flex-row justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <TouchableOpacity
                onPress={() => openEditModal(item)}
                className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-2xl py-3 flex-row items-center justify-center border border-slate-100 dark:border-slate-600"
              >
                <Ionicons
                  name="pencil"
                  size={16}
                  color={isDark ? "#CBD5E1" : "#475569"}
                />
                <Text className="text-slate-600 dark:text-slate-300 font-bold ml-2 text-sm">
                  Edit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmDelete(item.id)}
                className="flex-1 bg-rose-50 dark:bg-rose-500/10 rounded-2xl py-3 flex-row items-center justify-center border border-rose-100 dark:border-rose-500/20"
              >
                <Ionicons name="trash" size={16} color="#F43F5E" />
                <Text className="text-rose-500 font-bold ml-2 text-sm">
                  Hapus
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </InteractiveCard>
      </View>
    );
  }, [isDark, openEditModal, confirmDelete, updateAbsence]);

  const renderHeader = () => (
    <>
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

      <View className="px-5 mb-4 mt-2 flex-row justify-between items-end">
        <View className="flex-1 pr-2">
          <Text className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 mb-1 tracking-widest uppercase">
            Kurikulum
          </Text>
          <Text className="text-3xl font-serif font-bold text-[#1a365d] dark:text-white mb-2 tracking-tight">
            Mata Kuliah
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-sm">
            Kelola daftar mata kuliah yang Anda ambil.
          </Text>
        </View>
      </View>

      <View className="px-5 mb-6">
        <InteractiveCard onPress={openAddModal}>
          <View className="bg-emerald-500 dark:bg-emerald-600 rounded-[20px] py-3 flex-row items-center justify-center shadow-md shadow-emerald-500/20">
            <Ionicons name="add-circle" size={22} color="white" />
            <Text className="text-white font-bold text-[15px] ml-2 tracking-wide">
              Mata Kuliah Baru
            </Text>
          </View>
        </InteractiveCard>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-4">
        <View className="bg-white dark:bg-slate-800 flex-row items-center px-4 py-2 rounded-[16px] border border-slate-100 dark:border-slate-700 shadow-sm shadow-slate-200/50 dark:shadow-none">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2 text-slate-800 dark:text-white text-[14px] font-medium"
            placeholder="Cari mata kuliah..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50 dark:bg-[#0F172A]"
      edges={["top"]}
    >
      <FlatList
        data={courses.filter((c) =>
          c.course_name.toLowerCase().includes(searchQuery.toLowerCase()),
        )}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCourseItem}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadCourses().then(() => setRefreshing(false));
            }}
            tintColor={isDark ? "#cbd5e1" : "#475569"}
          />
        }
        contentContainerStyle={{
          paddingBottom: 160,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          courses.length > 0 ? (
            <View className="py-20 flex items-center justify-center">
              <Text className="text-slate-500 dark:text-slate-400">
                Tidak ada hasil pencarian.
              </Text>
            </View>
          ) : (
            <View className="py-20 flex items-center justify-center">
              <View className="mb-4">
                <Ionicons
                  name="library-outline"
                  size={80}
                  color={isDark ? "#334155" : "#CBD5E1"}
                />
              </View>
              <Text className="text-slate-800 dark:text-white text-lg font-bold">
                Data Kosong
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center mt-2 max-w-[250px]">
                Ketuk tombol + di atas untuk menambahkan mata kuliah pertama
                Anda.
              </Text>
            </View>
          )
        }
      />

      {/* Modal Add/Edit */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-slate-900/60">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="bg-white dark:bg-[#0F172A] rounded-t-3xl pt-2 pb-8 px-6 h-[80%]"
          >
            {/* Handle Bar */}
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2" />
            </View>

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-800 dark:text-white">
                {editingCourse ? "Edit Mata Kuliah" : "Tambah Mata Kuliah"}
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
                Nama Mata Kuliah *
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-slate-800 dark:text-white mb-6"
                placeholder="Contoh: Pemrograman Mobile"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={courseName}
                onChangeText={setCourseName}
              />
              <View className="flex-row justify-between">
                <View className="w-[48%]">
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    SKS
                  </Text>
                  <TextInput
                    className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-slate-800 dark:text-white mb-6"
                    placeholder="Contoh: 3"
                    placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                    keyboardType="numeric"
                    value={credits}
                    onChangeText={setCredits}
                  />
                </View>
                <View className="w-[48%]">
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Semester
                  </Text>
                  <TextInput
                    className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-slate-800 dark:text-white mb-6"
                    placeholder="Contoh: 5"
                    placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                    keyboardType="numeric"
                    value={semester}
                    onChangeText={setSemester}
                  />
                </View>
              </View>
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Nama Dosen
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-slate-800 dark:text-white mb-6"
                placeholder="Contoh: Budi Santoso, M.Kom"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={lecturer}
                onChangeText={setLecturer}
              />
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Batas Jatah Bolos (Max Absen)
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-slate-800 dark:text-white mb-8"
                placeholder="Contoh: 3"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                keyboardType="numeric"
                value={maxAbsences}
                onChangeText={setMaxAbsences}
              />
              <TouchableOpacity
                onPress={saveCourse}
                className="bg-blue-500 rounded-2xl py-4 items-center shadow-lg shadow-blue-500/30 dark:shadow-none"
              >
                <Text className="text-white font-bold text-base">
                  Simpan Data
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
