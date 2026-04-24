import * as SQLite from "expo-sqlite";

let db = null;

// Initialize Database Connection
export const openDatabase = async () => {
  try {
    if (db !== null) {
      // Verify the connection is still alive by running a quick query
      try {
        await db.getFirstAsync("SELECT 1");
        return db;
      } catch (_e) {
        // Connection is stale, reset and re-open
        console.warn("Stale DB connection detected, re-opening...");
        db = null;
      }
    }
    db = await SQLite.openDatabaseAsync("smart_study_planner.db");
    return db;
  } catch (error) {
    console.warn("Re-initializing DB due to error:", error);
    db = null; // Reset stale reference before retry
    try {
      db = await SQLite.openDatabaseAsync("smart_study_planner.db");
      return db;
    } catch (retryError) {
      console.error("Database re-initialization also failed:", retryError);
      db = null;
      throw retryError; // Propagate so callers can handle it
    }
  }
};

// Close the current database connection (needed for import/export)
export const closeDatabase = async () => {
  if (db !== null) {
    try {
      await db.closeAsync();
    } catch (e) {
      console.warn("Error closing database:", e);
    }
    db = null;
  }
};

// Flush WAL journal to the main .db file (needed before export)
export const checkpointDatabase = async () => {
  try {
    const database = await openDatabase();
    await database.execAsync("PRAGMA wal_checkpoint(FULL);");
  } catch (error) {
    console.warn("Checkpoint failed:", error);
  }
};

// Initialize Tables
export const initDatabase = async () => {
  try {
    const database = await openDatabase();

    // Create Tables
    await database.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_name TEXT NOT NULL,
        credits INTEGER DEFAULT 0,
        lecturer_name TEXT,
        semester INTEGER,
        absent_count INTEGER DEFAULT 0,
        max_absences INTEGER DEFAULT 3
      );

      CREATE TABLE IF NOT EXISTS study_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER,
        day_of_week TEXT,
        start_time TEXT,
        end_time TEXT,
        priority TEXT,
        notes TEXT,
        FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER,
        task_name TEXT NOT NULL,
        description TEXT,
        deadline TEXT,
        priority TEXT,
        status TEXT DEFAULT 'Belum Dikerjakan',
        FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS class_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER,
        day_of_week TEXT,
        start_time TEXT,
        end_time TEXT,
        room TEXT,
        building TEXT,
        class_type TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS course_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER,
        title TEXT NOT NULL,
        content TEXT,
        FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Migrasi bagi database lama yang belum memiliki kolom absensi
    try {
      await database.execAsync(`
        ALTER TABLE courses ADD COLUMN absent_count INTEGER DEFAULT 0;
      `);
    } catch (_e) {
      // Abaikan bila kolom sudah ada
    }

    try {
      await database.execAsync(`
        ALTER TABLE courses ADD COLUMN max_absences INTEGER DEFAULT 3;
      `);
    } catch (_e) {
      // Abaikan bila kolom sudah ada
    }

    // Migrasi: Tambahkan kolom created_at pada catatan
    try {
      await database.execAsync(`
        ALTER TABLE course_notes ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
    } catch (_e) {
      // Abaikan bila kolom sudah ada
    }

    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Error initializing database: ", error);
  }
};

// ========================
// REUSABLE CRUD HELPERS
// ========================

export const fetchAll = async (query, parameters = []) => {
  try {
    const database = await openDatabase();
    const result = await database.getAllAsync(query, parameters);
    return result;
  } catch (error) {
    console.error("Error fetching data: ", error);
    return [];
  }
};

export const fetchOne = async (query, parameters = []) => {
  try {
    const database = await openDatabase();
    const result = await database.getFirstAsync(query, parameters);
    return result;
  } catch (error) {
    console.error("Error fetching single data: ", error);
    return null;
  }
};

export const executeWrite = async (query, parameters = []) => {
  try {
    const database = await openDatabase();
    const result = await database.runAsync(query, parameters);
    return result; // contains { changes, lastInsertRowId }
  } catch (error) {
    console.error("Error writing data: ", error);
    // Re-throw so callers know the write failed
    throw error;
  }
};

// ========================
// SETTINGS HELPERS
// ========================

export const getSetting = async (key, defaultValue = null) => {
  try {
    const result = await fetchOne("SELECT value FROM settings WHERE id = ?", [key]);
    if (result && result.value) {
      return result.value;
    }
    return defaultValue;
  } catch (error) {
    console.error("Error fetching setting: ", error);
    return defaultValue;
  }
};

export const saveSetting = async (key, value) => {
  try {
    const existing = await fetchOne("SELECT id FROM settings WHERE id = ?", [key]);
    if (existing) {
      await executeWrite("UPDATE settings SET value = ? WHERE id = ?", [String(value), key]);
    } else {
      await executeWrite("INSERT INTO settings (id, value) VALUES (?, ?)", [key, String(value)]);
    }
    return true;
  } catch (error) {
    console.error("Error saving setting: ", error);
    return false;
  }
};
