import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import * as SQLite from "expo-sqlite";

import { getSetting, saveSetting, runDatabaseMaintenance } from "../database/dbHelper";
import { syncTaskNotifications } from "../services/notificationService";
import InteractiveCard from "../components/InteractiveCard";

export default function SettingsScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [notificationOffset, setNotificationOffset] = useState("24");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const offset = await getSetting("notify_offset_hours", "24");
      setNotificationOffset(offset);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleUpdateOffset = async (hours) => {
    setNotificationOffset(hours);
    const saved = await saveSetting("notify_offset_hours", hours);
    if (!saved) {
      Alert.alert("Error", "Gagal menyimpan preferensi notifikasi.");
      return;
    }

    try {
      await syncTaskNotifications();
      Alert.alert("Tersimpan", "Preferensi notifikasi berhasil diperbarui.");
    } catch (error) {
      console.warn("Failed to resync notifications:", error);
      Alert.alert(
        "Tersimpan",
        "Preferensi disimpan, tetapi jadwal notifikasi belum bisa disinkronkan.",
      );
    }
  };

  const getDbPath = () => {
    return `${FileSystem.documentDirectory}SQLite/smart_study_planner.db`;
  };

  const getSqliteFilePath = (fileName) => {
    return `${FileSystem.documentDirectory}SQLite/${fileName}`;
  };

  const deleteIfExists = async (path) => {
    const fileInfo = await FileSystem.getInfoAsync(path);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  };

  const deleteDatabaseFiles = async (path) => {
    await deleteIfExists(path);
    await deleteIfExists(`${path}-wal`);
    await deleteIfExists(`${path}-shm`);
  };

  const assertTableColumns = async (database, tableName, requiredColumns) => {
    const table = await database.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      [tableName],
    );
    if (!table) {
      throw new Error(`Tabel ${tableName} tidak ditemukan.`);
    }

    const columns = await database.getAllAsync(`PRAGMA table_info(${tableName})`);
    const columnNames = new Set(columns.map((column) => column.name));
    const missingColumn = requiredColumns.find((column) => !columnNames.has(column));
    if (missingColumn) {
      throw new Error(`Kolom ${tableName}.${missingColumn} tidak ditemukan.`);
    }
  };

  const validateImportedDatabase = async (sourceUri) => {
    const tempDbName = "smart_study_import_check.db";
    const tempDbPath = getSqliteFilePath(tempDbName);
    await deleteDatabaseFiles(tempDbPath);

    await FileSystem.copyAsync({
      from: sourceUri,
      to: tempDbPath,
    });

    let importedDb = null;
    try {
      importedDb = await SQLite.openDatabaseAsync(tempDbName);
      await assertTableColumns(importedDb, "courses", ["id", "course_name"]);
      await assertTableColumns(importedDb, "tasks", ["id", "task_name", "deadline", "status"]);
      await assertTableColumns(importedDb, "class_schedules", [
        "id",
        "course_id",
        "day_of_week",
        "start_time",
        "end_time",
      ]);
      await assertTableColumns(importedDb, "course_notes", ["id", "title", "content"]);
      await assertTableColumns(importedDb, "settings", ["id", "value"]);
    } finally {
      if (importedDb) {
        await importedDb.closeAsync();
      }
      await deleteDatabaseFiles(tempDbPath);
    }
  };

  const exportDatabase = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      const dbPath = getDbPath();
      const fileInfo = await FileSystem.getInfoAsync(dbPath);
      
      if (!fileInfo.exists) {
        Alert.alert("Gagal", "File database tidak ditemukan.");
        return;
      }

      await runDatabaseMaintenance(async ({
        checkpointDatabase: maintenanceCheckpointDatabase,
        closeDatabase: maintenanceCloseDatabase,
        initDatabase: maintenanceInitDatabase,
      }) => {
        await maintenanceCheckpointDatabase();
        await maintenanceCloseDatabase();

        try {
          const isAvailable = await Sharing.isAvailableAsync();
          if (!isAvailable) {
            Alert.alert("Maaf", "Fitur berbagi tidak tersedia di perangkat ini.");
            return;
          }

          await Sharing.shareAsync(dbPath, {
            mimeType: "application/x-sqlite3",
            dialogTitle: "Ekspor Database Smart Study Planner",
          });
        } finally {
          await maintenanceInitDatabase();
        }
      });
    } catch (error) {
      console.error("Export DB Error:", error);
      Alert.alert("Error", "Gagal mengekspor data: " + (error.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  const importDatabase = async () => {
    if (isImporting) return;

    try {
      setIsImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      // Updated handling for expo-document-picker v12+
      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsImporting(false);
        return; 
      }

      const fileAsset = result.assets[0];
      const dbPath = getDbPath();

      if (!fileAsset.name.toLowerCase().endsWith(".db")) {
        Alert.alert(
          "Format Salah",
          "Harap pilih file database dengan ekstensi .db yang didapat dari fitur ekspor sebelumnya."
        );
        setIsImporting(false);
        return;
      }

      try {
        await validateImportedDatabase(fileAsset.uri);
      } catch (validationError) {
        Alert.alert(
          "Backup Tidak Valid",
          validationError.message || "File database tidak sesuai schema Smart Study.",
        );
        setIsImporting(false);
        return;
      }

      let didConfirmImport = false;
      Alert.alert(
        "Peringatan",
        "Mengimpor data akan menimpa seluruh jadwal, tugas, dan catatan Anda saat ini. Lanjutkan?",
        [
          {
            text: "Batal",
            style: "cancel",
            onPress: () => setIsImporting(false),
          },
          {
            text: "Timpa Data",
            style: "destructive",
            onPress: async () => {
              didConfirmImport = true;
              const backupPath = getSqliteFilePath("smart_study_planner.rollback.db");
              await runDatabaseMaintenance(async ({
                checkpointDatabase: maintenanceCheckpointDatabase,
                closeDatabase: maintenanceCloseDatabase,
                initDatabase: maintenanceInitDatabase,
              }) => {
                let didReopenDatabase = false;

                try {
                  await maintenanceCheckpointDatabase();
                  await maintenanceCloseDatabase();

                  await deleteDatabaseFiles(backupPath);
                  const currentDbInfo = await FileSystem.getInfoAsync(dbPath);
                  if (currentDbInfo.exists) {
                    await FileSystem.copyAsync({
                      from: dbPath,
                      to: backupPath,
                    });
                  }

                  await deleteIfExists(`${dbPath}-wal`);
                  await deleteIfExists(`${dbPath}-shm`);

                  await FileSystem.copyAsync({
                    from: fileAsset.uri,
                    to: dbPath,
                  });

                  await maintenanceInitDatabase();
                  didReopenDatabase = true;
                  await deleteDatabaseFiles(backupPath);

                  Alert.alert(
                    "Impor Berhasil",
                    "Data berhasil dikembalikan. Semua halaman akan otomatis memuat data terbaru."
                  );
                } catch (err) {
                  console.error("Paste DB Error:", err);

                  try {
                    await maintenanceCloseDatabase();
                    const backupInfo = await FileSystem.getInfoAsync(backupPath);
                    if (backupInfo.exists) {
                      await deleteIfExists(`${dbPath}-wal`);
                      await deleteIfExists(`${dbPath}-shm`);
                      await FileSystem.copyAsync({
                        from: backupPath,
                        to: dbPath,
                      });
                    }
                  } catch (rollbackError) {
                    console.error("Rollback DB Error:", rollbackError);
                  }

                  try {
                    await maintenanceInitDatabase();
                    didReopenDatabase = true;
                  } catch (_e) {}
                  Alert.alert("Error", "Gagal menyalin file database. Data lama dipulihkan bila backup tersedia.");
                } finally {
                  if (!didReopenDatabase) {
                    try {
                      await maintenanceInitDatabase();
                    } catch (_e) {}
                  }
                  setIsImporting(false);
                }
              });
            },
          },
        ],
        {
          onDismiss: () => {
            if (!didConfirmImport) setIsImporting(false);
          },
        },
      );
    } catch (error) {
      console.error("Import DB Error:", error);
      Alert.alert("Error", "Gagal mengimpor data: " + (error.message || "Unknown error"));
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0F172A]">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View className="px-6 pt-6 pb-4 flex-row items-center border-b border-slate-200 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          className="w-11 h-11 bg-white dark:bg-slate-800 rounded-full items-center justify-center mr-4 shadow-sm border border-slate-100 dark:border-slate-700"
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
                accessibilityRole="button"
                accessibilityLabel={`Pilih notifikasi ${option.label}`}
                accessibilityState={{ selected: isSelected }}
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
            Anda dapat mengekspor data saat ini (mata kuliah, jadwal, tugas, dan catatan) untuk memindahkannya ke perangkat lain menggunakan mekanisme Impor.
          </Text>
        </View>

        <View className="flex-row justify-between mb-8">
          <View className="w-[48%]">
            <InteractiveCard
              onPress={exportDatabase}
              disabled={isExporting || isImporting}
              accessibilityLabel={isExporting ? "Sedang mengekspor data" : "Ekspor data"}
              accessibilityHint="Membagikan file backup database"
              accessibilityState={{ disabled: isExporting || isImporting }}
            >
              <View className="bg-white dark:bg-slate-800 rounded-[24px] p-5 items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                <View className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mb-3">
                  {isExporting ? (
                    <ActivityIndicator color="#3B82F6" size="small" />
                  ) : (
                    <Ionicons name="arrow-up" size={24} color="#3B82F6" />
                  )}
                </View>
                <Text className="text-slate-800 dark:text-white font-bold text-center">
                  {isExporting ? "Memproses..." : "Ekspor Data"}
                </Text>
                <Text className="text-slate-400 text-[10px] mt-1 text-center">
                  Backup .db File
                </Text>
              </View>
            </InteractiveCard>
          </View>

          <View className="w-[48%]">
            <InteractiveCard
              onPress={importDatabase}
              disabled={isExporting || isImporting}
              accessibilityLabel={isImporting ? "Sedang mengimpor data" : "Impor data"}
              accessibilityHint="Memilih file backup database untuk dipulihkan"
              accessibilityState={{ disabled: isExporting || isImporting }}
            >
              <View className="bg-white dark:bg-slate-800 rounded-[24px] p-5 items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                <View className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full items-center justify-center mb-3">
                  {isImporting ? (
                    <ActivityIndicator color="#10B981" size="small" />
                  ) : (
                    <Ionicons name="arrow-down" size={24} color="#10B981" />
                  )}
                </View>
                <Text className="text-slate-800 dark:text-white font-bold text-center">
                  {isImporting ? "Memproses..." : "Impor Data"}
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
