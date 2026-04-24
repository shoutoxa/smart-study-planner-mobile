import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

import { getSetting, saveSetting, closeDatabase, checkpointDatabase, initDatabase } from "../database/dbHelper";
import InteractiveCard from "../components/InteractiveCard";

export default function SettingsScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [notificationOffset, setNotificationOffset] = useState("24");

  const loadSettings = async () => {
    try {
      const offset = await getSetting("notify_offset_hours", "24");
      setNotificationOffset(offset);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const handleUpdateOffset = async (hours) => {
    setNotificationOffset(hours);
    await saveSetting("notify_offset_hours", hours);
    Alert.alert("Tersimpan", "Preferensi notifikasi berhasil diperbarui.");
  };

  const getDbPath = () => {
    return `${FileSystem.documentDirectory}SQLite/smart_study_planner.db`;
  };

  const exportDatabase = async () => {
    try {
      const dbPath = getDbPath();
      const fileInfo = await FileSystem.getInfoAsync(dbPath);
      
      if (!fileInfo.exists) {
        Alert.alert("Gagal", "File database tidak ditemukan.");
        return;
      }

      // Flush WAL journal to main .db file so the exported file contains all data
      await checkpointDatabase();
      // Close the connection so the file is not locked during sharing
      await closeDatabase();

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        // Re-initialize DB connection since we closed it
        await initDatabase();
        Alert.alert("Maaf", "Fitur berbagi tidak tersedia di perangkat ini.");
        return;
      }

      await Sharing.shareAsync(dbPath, {
        mimeType: "application/x-sqlite3",
        dialogTitle: "Ekspor Database Smart Study Planner",
      });

      // Re-initialize DB connection after sharing is done
      await initDatabase();
    } catch (error) {
      console.error("Export DB Error:", error);
      // Ensure DB is re-opened even on error
      try { await initDatabase(); } catch (_e) {}
      Alert.alert("Error", "Gagal mengekspor data: " + (error.message || "Unknown error"));
    }
  };

  const importDatabase = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      // Updated handling for expo-document-picker v12+
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return; 
      }

      const fileAsset = result.assets[0];
      const dbPath = getDbPath();

      if (!fileAsset.name.endsWith(".db")) {
        Alert.alert(
          "Format Salah",
          "Harap pilih file database dengan ekstensi .db yang didapat dari fitur ekspor sebelumnya."
        );
        return;
      }

      Alert.alert(
        "Peringatan",
        "Mengimpor data akan menimpa seluruh jadwal, tugas, dan catatan Anda saat ini. Lanjutkan?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Timpa Data",
            style: "destructive",
            onPress: async () => {
              try {
                // 1. Close existing database connection
                await closeDatabase();

                // 2. Delete old WAL and SHM journal files to prevent stale data
                const walPath = dbPath + "-wal";
                const shmPath = dbPath + "-shm";
                try {
                  const walInfo = await FileSystem.getInfoAsync(walPath);
                  if (walInfo.exists) await FileSystem.deleteAsync(walPath, { idempotent: true });
                } catch (_e) {}
                try {
                  const shmInfo = await FileSystem.getInfoAsync(shmPath);
                  if (shmInfo.exists) await FileSystem.deleteAsync(shmPath, { idempotent: true });
                } catch (_e) {}

                // 3. Copy the imported file over
                await FileSystem.copyAsync({
                  from: fileAsset.uri,
                  to: dbPath,
                });

                // 4. Re-initialize database with the new file
                await initDatabase();

                Alert.alert(
                  "Impor Berhasil",
                  "Data berhasil dikembalikan. Semua halaman akan otomatis memuat data terbaru."
                );
              } catch (err) {
                console.error("Paste DB Error:", err);
                // Try to recover DB connection
                try { await initDatabase(); } catch (_e) {}
                Alert.alert("Error", "Gagal menyalin file database: " + (err.message || "Unknown error"));
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Import DB Error:", error);
      Alert.alert("Error", "Gagal mengimpor data: " + (error.message || "Unknown error"));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0F172A]">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View className="px-6 pt-6 pb-4 flex-row items-center border-b border-slate-200 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full items-center justify-center mr-4 shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? "#E2E8F0" : "#1E293B"} />
        </TouchableOpacity>
        <Text className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Pengaturan
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Notifikasi Section */}
        <View className="mb-2">
          <Text className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 mb-1 tracking-widest uppercase">
            Preferensi
          </Text>
          <Text className="text-2xl font-serif font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
            Tenggat Waktu
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Kapan aplikasi harus membunyikan alarm push notification sebelum deadline tugas?
          </Text>
        </View>

        <View className="bg-white dark:bg-slate-800 rounded-[28px] p-2 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 mb-8">
          {[
            { label: "1 Jam Sebelumnya", value: "1" },
            { label: "12 Jam Sebelumnya", value: "12" },
            { label: "1 Hari (24 Jam) Sebelumnya", value: "24" },
            { label: "3 Hari Sebelumnya", value: "72" }
          ].map((option, idx, arr) => {
            const isSelected = notificationOffset === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleUpdateOffset(option.value)}
                className={`flex-row items-center py-4 px-4 ${
                  idx !== arr.length - 1 ? "border-b border-slate-100 dark:border-slate-700" : ""
                }`}
              >
                <View className="flex-1">
                  <Text className={`font-bold ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                    {option.label}
                  </Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected ? "border-indigo-500" : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {isSelected && <View className="w-3 h-3 bg-indigo-500 rounded-full" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Data Management Section */}
        <View className="mb-2">
          <Text className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 mb-1 tracking-widest uppercase">
            Sistem
          </Text>
          <Text className="text-2xl font-serif font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
            Manajemen Data
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Anda dapat mengekspor data saat ini (termasuk jadwal, tugas, nilai) untuk memindahkannya ke perangkat lain menggunakan mekanisme Impor.
          </Text>
        </View>

        <View className="flex-row justify-between mb-8">
          <View className="w-[48%]">
            <InteractiveCard onPress={exportDatabase}>
              <View className="bg-white dark:bg-slate-800 rounded-[24px] p-5 items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                <View className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mb-3">
                  <Ionicons name="arrow-up" size={24} color="#3B82F6" />
                </View>
                <Text className="text-slate-800 dark:text-white font-bold text-center">
                  Ekspor Data
                </Text>
                <Text className="text-slate-400 text-[10px] mt-1 text-center">
                  Backup .db File
                </Text>
              </View>
            </InteractiveCard>
          </View>

          <View className="w-[48%]">
            <InteractiveCard onPress={importDatabase}>
              <View className="bg-white dark:bg-slate-800 rounded-[24px] p-5 items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                <View className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full items-center justify-center mb-3">
                  <Ionicons name="arrow-down" size={24} color="#10B981" />
                </View>
                <Text className="text-slate-800 dark:text-white font-bold text-center">
                  Impor Data
                </Text>
                <Text className="text-slate-400 text-[10px] mt-1 text-center">
                  Ganti dgn Backup
                </Text>
              </View>
            </InteractiveCard>
          </View>
        </View>
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
