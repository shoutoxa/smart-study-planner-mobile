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
import InteractiveCard from "../components/InteractiveCard";

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const filterChips = ["Semua", "Semester 6", "Tugas Akhir", "Umum"];
  const [activeChip, setActiveChip] = useState("Semua");

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [courseId, setCourseId] = useState("");

  const loadData = async () => {
    try {
      const notesData = await fetchAll(`
        SELECT n.*, c.course_name 
        FROM course_notes n 
        LEFT JOIN courses c ON n.course_id = c.id 
        ORDER BY n.id DESC
      `);
      setNotes(notesData);

      const coursesData = await fetchAll(
        "SELECT id, course_name FROM courses ORDER BY course_name ASC",
      );
      setCourses(coursesData);
    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const openAddModal = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setCourseId("");
    setModalVisible(true);
  };

  const openEditModal = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content || "");
    setCourseId(note.course_id || "");
    setModalVisible(true);
  };

  const saveNote = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Judul catatan tidak boleh kosong");
      return;
    }

    try {
      if (editingNote) {
        await executeWrite(
          "UPDATE course_notes SET course_id = ?, title = ?, content = ? WHERE id = ?",
          [courseId || null, title, content, editingNote.id],
        );
      } else {
        await executeWrite(
          "INSERT INTO course_notes (course_id, title, content) VALUES (?, ?, ?)",
          [courseId || null, title, content],
        );
      }
      setModalVisible(false);
      setTimeout(() => {
        loadData();
      }, 100);
    } catch (error) {
      console.error("Failed to save note:", error);
      Alert.alert("Error", "Gagal menyimpan catatan");
    }
  };

  const confirmDelete = (id) => {
    Alert.alert("Hapus Catatan", "Apakah Anda yakin?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await executeWrite("DELETE FROM course_notes WHERE id = ?", [id]);
          setTimeout(() => {
            loadData();
          }, 100);
        },
      },
    ]);
  };

  // Mock function to determine if a note is "Pinned" just for UI presentation (the first item)
  const isPinned = (index) => index === 0 && notes.length > 2;

  const renderNoteItem = useCallback(({ item, index }) => {
    const pinned = isPinned(index);

    // Assign random nice colors for the icon bg based on ID so it stays consistent
    const bgHex = [
      "rgba(168,85,247,0.2)",
      "rgba(16,185,129,0.2)",
      "rgba(249,115,22,0.2)",
      "rgba(244,63,94,0.2)",
      "rgba(59,130,246,0.2)",
    ];
    const textColors = [
      { dark: "#c084fc", light: "#a855f7" }, // purple-400 : purple-500
      { dark: "#34d399", light: "#10b981" }, // emerald-400 : emerald-500
      { dark: "#fb923c", light: "#f97316" }, // orange-400 : orange-500
      { dark: "#fb7185", light: "#f43f5e" }, // rose-400 : rose-500
      { dark: "#60a5fa", light: "#3b82f6" }, // blue-400 : blue-500
    ];
    const idx = item.id % 5;

    if (pinned) {
      return (
        <View className="mb-6 px-5">
          <InteractiveCard onPress={() => openEditModal(item)}>
            <View className="bg-emerald-600 dark:bg-emerald-700 rounded-[28px] p-6 shadow-sm shadow-emerald-600/20 relative overflow-hidden">
              <View className="absolute right-0 top-0 opacity-10">
                <Ionicons name="bookmark" size={120} color="white" />
              </View>
              <View className="flex-row justify-between mb-4 mt-2">
                <Text className="text-emerald-100 bg-emerald-500/50 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase">
                  Penting
                </Text>
                <Text className="text-emerald-100/80 text-[11px] font-semibold mt-1">
                  Baru saja
                </Text>
              </View>
              <Text className="text-white text-2xl font-bold font-serif mb-3 leading-snug">
                {item.title}
              </Text>
              <Text
                className="text-emerald-50 font-medium leading-relaxed text-[15px] opacity-90"
                numberOfLines={2}
              >
                {item.content || "Tidak ada pratinjau konten."}
              </Text>
            </View>
          </InteractiveCard>
        </View>
      );
    }

    return (
      <View className="mb-4 px-5">
        <InteractiveCard onPress={() => openEditModal(item)}>
          <View className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-2xl items-center justify-center mr-3 border border-slate-100 dark:border-slate-700/50"
                  style={{ backgroundColor: bgHex[idx] }}
                >
                  <Ionicons
                    name="book"
                    size={18}
                    color={
                      isDark ? textColors[idx].dark : textColors[idx].light
                    }
                  />
                </View>
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
                  {item.course_name
                    ? item.course_name.substring(0, 20)
                    : "Catatan Umum"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmDelete(item.id)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl"
              >
                <Ionicons name="trash" size={16} color="#F43F5E" />
              </TouchableOpacity>
            </View>
            <Text className="text-slate-800 dark:text-white text-xl font-bold font-serif mb-2 leading-snug">
              {item.title}
            </Text>
            <Text
              className="text-slate-500 dark:text-slate-400 leading-relaxed text-[15px] font-medium mb-5"
              numberOfLines={2}
            >
              {item.content || "Tidak ada pratinjau konten."}
            </Text>
            <View className="flex-row items-center text-xs pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Ionicons
                name="time"
                size={14}
                color={isDark ? "#64748B" : "#94A3B8"}
              />
              <Text className="text-slate-500 dark:text-slate-500 text-xs ml-1.5 font-bold mr-4">
                Hari ini
              </Text>
              <Ionicons
                name="document-text"
                size={14}
                color={isDark ? "#64748B" : "#94A3B8"}
              />
              <Text className="text-slate-500 dark:text-slate-500 text-xs ml-1.5 font-bold">
                0 Files
              </Text>
            </View>
          </View>
        </InteractiveCard>
      </View>
    );
  }, [isDark, confirmDelete, openEditModal, notes.length]);

  const renderHeader = () => (
    <>
      {/* Header aligned to dashboard */}
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
            Jurnal
          </Text>
          <Text className="text-3xl font-serif font-bold text-[#1a365d] dark:text-white mb-2 tracking-tight">
            Catatan
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-sm">
            Simpan ide ringkasan dan materi kuliahmu.
          </Text>
        </View>
      </View>

      <View className="px-5 mb-6">
        <InteractiveCard onPress={openAddModal}>
          <View className="bg-emerald-500 dark:bg-emerald-600 rounded-[20px] py-3 flex-row items-center justify-center shadow-md shadow-emerald-500/20">
            <Ionicons name="create" size={22} color="white" />
            <Text className="text-white font-bold text-[15px] ml-2 tracking-wide">
              Tulis Catatan Baru
            </Text>
          </View>
        </InteractiveCard>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-5">
        <View className="bg-white dark:bg-slate-800 flex-row items-center px-4 py-2 rounded-[16px] border border-slate-100 dark:border-slate-700 shadow-sm shadow-slate-200/50 dark:shadow-none">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2 text-slate-800 dark:text-white text-[14px] font-medium"
            placeholder="Cari catatan kuliah..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 mb-6"
        >
          {filterChips.map((chip) => (
            <TouchableOpacity
              key={chip}
              onPress={() => setActiveChip(chip)}
              className="px-5 py-2.5 rounded-full mr-3 border"
              style={{
                backgroundColor:
                  activeChip === chip ? "#3b82f6" : "transparent",
                borderColor:
                  activeChip === chip
                    ? "#3b82f6"
                    : isDark
                      ? "#334155"
                      : "#cbd5e1",
              }}
            >
              <Text
                className="font-semibold"
                style={{
                  color:
                    activeChip === chip
                      ? "#ffffff"
                      : isDark
                        ? "#cbd5e1"
                        : "#475569",
                }}
              >
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
          <View className="w-10" />
        </ScrollView>
      </View>
    </>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50 dark:bg-[#0F172A]"
      edges={["top"]}
    >
      {/* Notes List */}
      <FlatList
        data={notes.filter((n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()),
        )}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNoteItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons
              name="document-text-outline"
              size={60}
              color={isDark ? "#334155" : "#CBD5E1"}
              className="mb-4"
            />
            <Text className="text-slate-500 dark:text-slate-400 font-medium text-center">
              Belum ada catatan.
            </Text>
          </View>
        }
      />

      {/* Modal Add/Edit */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-slate-900/60">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="bg-white dark:bg-[#0F172A] rounded-t-[40px] h-[92%] overflow-hidden"
          >
            {/* Header / Grabber */}
            <View className="items-center pt-3 pb-4 bg-white dark:bg-[#0F172A] z-10 border-b border-slate-100 dark:border-slate-800">
              <View className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mb-4" />
              <View className="w-full px-6 flex-row justify-between items-center">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? "#94A3B8" : "#64748B"}
                  />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-slate-800 dark:text-white">
                  {editingNote ? "Edit Catatan" : "📝 Tulis Catatan"}
                </Text>
                <TouchableOpacity
                  onPress={saveNote}
                  className="bg-blue-500 px-5 py-2 rounded-full"
                >
                  <Text className="text-white font-bold">Simpan</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 24, paddingBottom: 150 }}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                className="text-3xl font-extrabold text-slate-800 dark:text-white mb-6"
                placeholder="Judul Catatan..."
                placeholderTextColor={isDark ? "#475569" : "#94A3B8"}
                value={title}
                onChangeText={setTitle}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-8"
                style={{ maxHeight: 40 }}
              >
                <TouchableOpacity
                  onPress={() => setCourseId("")}
                  className="px-4 py-2 rounded-xl border mr-2 flex-row items-center"
                  style={{
                    backgroundColor:
                      courseId === ""
                        ? isDark
                          ? "rgba(30, 58, 138, 0.4)"
                          : "#eff6ff"
                        : "transparent",
                    borderColor:
                      courseId === ""
                        ? "#3b82f6"
                        : isDark
                          ? "#334155"
                          : "#e2e8f0",
                  }}
                >
                  <Ionicons
                    name="list"
                    size={14}
                    color={
                      courseId === ""
                        ? "#3B82F6"
                        : isDark
                          ? "#94A3B8"
                          : "#64748B"
                    }
                  />
                  <Text
                    className="text-sm font-medium ml-2"
                    style={{
                      color:
                        courseId === ""
                          ? isDark
                            ? "#60a5fa"
                            : "#2563eb"
                          : isDark
                            ? "#94a3b8"
                            : "#475569",
                    }}
                  >
                    Umum
                  </Text>
                </TouchableOpacity>
                {courses.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCourseId(c.id)}
                    className="px-4 py-2 rounded-xl border mr-2 flex-row items-center"
                    style={{
                      backgroundColor:
                        courseId === c.id
                          ? isDark
                            ? "rgba(30, 58, 138, 0.4)"
                            : "#eff6ff"
                          : "transparent",
                      borderColor:
                        courseId === c.id
                          ? "#3b82f6"
                          : isDark
                            ? "#334155"
                            : "#e2e8f0",
                    }}
                  >
                    <Ionicons
                      name="book"
                      size={14}
                      color={
                        courseId === c.id
                          ? "#3B82F6"
                          : isDark
                            ? "#94A3B8"
                            : "#64748B"
                      }
                    />
                    <Text
                      className="text-sm font-medium ml-2"
                      style={{
                        color:
                          courseId === c.id
                            ? isDark
                              ? "#60a5fa"
                              : "#2563eb"
                            : isDark
                              ? "#94a3b8"
                              : "#475569",
                      }}
                    >
                      {c.course_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                className="text-lg text-slate-600 dark:text-slate-300 leading-8 min-h-[400px]"
                placeholder="Mulai menulis ide dan materi kuliah di sini..."
                placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
                multiline
                textAlignVertical="top"
                value={content}
                onChangeText={setContent}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
