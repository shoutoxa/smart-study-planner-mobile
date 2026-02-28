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

export default function CoursesScreen() {
  const [courses, setCourses] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Form State
  const [courseName, setCourseName] = useState("");
  const [credits, setCredits] = useState("");
  const [lecturer, setLecturer] = useState("");
  const [semester, setSemester] = useState("");

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
    setModalVisible(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setCourseName(course.course_name);
    setCredits(course.credits ? course.credits.toString() : "");
    setLecturer(course.lecturer_name || "");
    setSemester(course.semester ? course.semester.toString() : "");
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
          "UPDATE courses SET course_name = ?, credits = ?, lecturer_name = ?, semester = ? WHERE id = ?",
          [
            courseName,
            parseInt(credits) || 0,
            lecturer,
            parseInt(semester) || 0,
            editingCourse.id,
          ],
        );
      } else {
        // Insert
        await executeWrite(
          "INSERT INTO courses (course_name, credits, lecturer_name, semester) VALUES (?, ?, ?, ?)",
          [
            courseName,
            parseInt(credits) || 0,
            lecturer,
            parseInt(semester) || 0,
          ],
        );
      }
      setModalVisible(false);
      loadCourses();
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
            await executeWrite("DELETE FROM courses WHERE id = ?", [id]);
            loadCourses();
          },
        },
      ],
    );
  };

  const renderCourseItem = ({ item }) => {
    const bgColors = [
      "bg-blue-100 dark:bg-blue-900/30",
      "bg-purple-100 dark:bg-purple-900/30",
      "bg-emerald-100 dark:bg-emerald-900/30",
      "bg-orange-100 dark:bg-orange-900/30",
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
      <View className="bg-white dark:bg-[#1E293B] rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
        <View className="flex-row justify-between items-center mb-4">
          <View
            className={`${bgColors[idx]} w-12 h-12 rounded-xl items-center justify-center`}
          >
            <Ionicons
              name={icons[idx]}
              size={24}
              color={isDark ? "#fff" : colorHex[idx]}
            />
          </View>
          <View className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
            <Text className="text-slate-600 dark:text-slate-300 font-bold text-xs">
              {item.credits} SKS
            </Text>
          </View>
        </View>

        <Text className="text-xl font-bold text-slate-800 dark:text-white mb-3">
          {item.course_name}
        </Text>

        <View className="flex-row items-center mb-2">
          <Ionicons name="person-outline" size={16} color="#64748B" />
          <Text className="text-slate-500 dark:text-slate-400 text-sm ml-2.5">
            {item.lecturer_name || "Tanpa Dosen"}
          </Text>
        </View>
        <View className="flex-row items-center mb-5">
          <Ionicons name="calendar-outline" size={16} color="#64748B" />
          <Text className="text-slate-500 dark:text-slate-400 text-sm ml-2.5">
            Semester {item.semester}
          </Text>
        </View>

        <View className="flex-row justify-between gap-3">
          <TouchableOpacity
            onPress={() => openEditModal(item)}
            className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl py-3 flex-row items-center justify-center border border-slate-100 dark:border-slate-600"
          >
            <Ionicons
              name="pencil"
              size={16}
              color={isDark ? "#CBD5E1" : "#475569"}
            />
            <Text className="text-slate-700 dark:text-slate-300 font-medium ml-2 text-sm">
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmDelete(item.id)}
            className="flex-1 bg-rose-50 dark:bg-rose-900/20 rounded-xl py-3 flex-row items-center justify-center border border-rose-100 dark:border-rose-900/50"
          >
            <Ionicons name="trash-outline" size={16} color="#F43F5E" />
            <Text className="text-rose-500 font-medium ml-2 text-sm">
              Hapus
            </Text>
          </TouchableOpacity>
        </View>
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
      </View>

      <View className="px-5 mb-6 flex-row justify-between items-end">
        <View className="flex-1 pr-2">
          <Text className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">
            Daftar Matkul
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-sm">
            Kelola daftar mata kuliah yang Anda ambil.
          </Text>
        </View>
        <TouchableOpacity
          onPress={openAddModal}
          className="bg-blue-500 w-14 h-14 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/30"
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-6">
        <View className="bg-white dark:bg-[#1E293B] flex-row items-center px-4 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            className="flex-1 ml-3 text-slate-800 dark:text-white text-base"
            placeholder="Cari mata kuliah..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {courses.length > 0 ? (
        <FlatList
          data={courses.filter((c) =>
            c.course_name.toLowerCase().includes(searchQuery.toLowerCase()),
          )}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCourseItem}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-20 flex items-center justify-center">
              <Text className="text-slate-500 dark:text-slate-400">
                Tidak ada hasil pencarian.
              </Text>
            </View>
          }
        />
      ) : (
        <View className="flex-1 px-5 flex items-center justify-center -mt-20">
          <Ionicons
            name="library-outline"
            size={80}
            color={isDark ? "#334155" : "#CBD5E1"}
            className="mb-4"
          />
          <Text className="text-slate-800 dark:text-white text-lg font-bold">
            Data Kosong
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center mt-2 max-w-[250px]">
            Ketuk tombol + di atas untuk menambahkan mata kuliah pertama Anda.
          </Text>
        </View>
      )}

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
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-slate-800 dark:text-white mb-8"
                placeholder="Contoh: Budi Santoso, M.Kom"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                value={lecturer}
                onChangeText={setLecturer}
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
