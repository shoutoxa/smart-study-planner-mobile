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

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const { colorScheme } = useColorScheme();
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
      loadData();
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
          loadData();
        },
      },
    ]);
  };

  // Mock function to determine if a note is "Pinned" just for UI presentation (the first item)
  const isPinned = (index) => index === 0 && notes.length > 2;

  const renderNoteItem = ({ item, index }) => {
    const pinned = isPinned(index);

    // Assign random nice colors for the icon bg based on ID so it stays consistent
    const bgColors = [
      "bg-purple-500/20",
      "bg-emerald-500/20",
      "bg-orange-500/20",
      "bg-rose-500/20",
      "bg-blue-500/20",
    ];
    const textColors = [
      "text-purple-500",
      "text-emerald-500",
      "text-orange-500",
      "text-rose-500",
      "text-blue-500",
    ];
    const idx = item.id % 5;

    if (pinned) {
      return (
        <TouchableOpacity
          onPress={() => openEditModal(item)}
          className="bg-blue-500 rounded-3xl p-5 mb-4 relative overflow-hidden"
        >
          <View className="absolute right-4 top-4 opacity-30">
            <Ionicons name="pin" size={40} color="white" />
          </View>
          <View className="flex-row justify-between mb-3">
            <Text className="text-blue-100 bg-blue-400/50 px-3 py-1 rounded-full text-xs font-medium">
              Penting
            </Text>
            <Text className="text-blue-100 text-xs">Baru saja</Text>
          </View>
          <Text className="text-white text-xl font-bold mb-2">
            {item.title}
          </Text>
          <Text
            className="text-blue-100 leading-relaxed text-sm"
            numberOfLines={2}
          >
            {item.content || "Tidak ada pratinjau konten."}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => openEditModal(item)}
        className="bg-white dark:bg-[#1E293B] rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800"
      >
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center">
            <View
              className={`w-8 h-8 rounded-lg items-center justify-center ${bgColors[idx]} mr-3`}
            >
              <Ionicons
                name="book"
                size={14}
                className={textColors[idx]}
                color={isDark ? "#fff" : "#000"}
              />
            </View>
            <Text className="text-slate-500 dark:text-slate-400 text-xs font-medium">
              {item.course_name
                ? item.course_name.substring(0, 25)
                : "Catatan Umum"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => confirmDelete(item.id)}>
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={isDark ? "#64748B" : "#94A3B8"}
            />
          </TouchableOpacity>
        </View>
        <Text className="text-slate-800 dark:text-white text-lg font-bold mb-2">
          {item.title}
        </Text>
        <Text
          className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-4"
          numberOfLines={2}
        >
          {item.content || "Tidak ada pratinjau konten."}
        </Text>
        <View className="flex-row items-center text-xs">
          <Ionicons
            name="time-outline"
            size={14}
            color={isDark ? "#64748B" : "#94A3B8"}
          />
          <Text className="text-slate-500 dark:text-slate-500 text-xs ml-1 mr-4">
            Hari ini
          </Text>
          <Ionicons
            name="document-attach-outline"
            size={14}
            color={isDark ? "#64748B" : "#94A3B8"}
          />
          <Text className="text-slate-500 dark:text-slate-500 text-xs ml-1">
            0 Files
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0F172A]">
      {/* Header aligned to screenshot 2 */}
      <View className="px-5 pt-4 flex-row justify-between items-center mb-6">
        <View className="flex-row items-center">
          <Ionicons name="school" size={24} color="#3B82F6" />
          <Text className="text-lg font-bold text-slate-800 dark:text-white ml-2">
            SmartStudy
          </Text>
        </View>
      </View>

      <View className="px-5 mb-5 flex-row justify-between items-end">
        <View>
          <Text className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">
            Catatan Saya
          </Text>
          <Text className="text-slate-500 dark:text-slate-400">
            Simpan ide dan materi kuliahmu.
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
            placeholder="Cari catatan kuliah..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="options-outline" size={20} color="#64748B" />
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
              className={`px-5 py-2.5 rounded-full mr-3 border ${activeChip === chip ? "bg-blue-500 border-blue-500" : "bg-transparent border-slate-300 dark:border-slate-700"}`}
            >
              <Text
                className={`font-semibold ${activeChip === chip ? "text-white" : "text-slate-600 dark:text-slate-300"}`}
              >
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
          <View className="w-10" />
        </ScrollView>
      </View>

      {/* Notes List */}
      <FlatList
        data={notes.filter((n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()),
        )}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNoteItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
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
                  className={`px-4 py-2 rounded-xl border mr-2 flex-row items-center ${courseId === "" ? "bg-blue-50 dark:bg-blue-900/40 border-blue-500" : "bg-transparent border-slate-200 dark:border-slate-700"}`}
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
                    className={`text-sm font-medium ml-2 ${courseId === "" ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}
                  >
                    Umum
                  </Text>
                </TouchableOpacity>
                {courses.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCourseId(c.id)}
                    className={`px-4 py-2 rounded-xl border mr-2 flex-row items-center ${courseId === c.id ? "bg-blue-50 dark:bg-blue-900/40 border-blue-500" : "bg-transparent border-slate-200 dark:border-slate-700"}`}
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
                      className={`text-sm font-medium ml-2 ${courseId === c.id ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}
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
