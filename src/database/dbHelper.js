import * as SQLite from "expo-sqlite";
import { parseDeadlineToTimestamp } from "../utils/dateTime";

const DATABASE_NAME = "smart_study_planner.db";
const RECOVERABLE_DB_ERROR_PATTERNS = [
  "nativedatabase.prepareasync",
  "nullpointerexception",
  "database is closed",
  "database has been closed",
  "stale",
];

let db = null;
let openDatabasePromise = null;
let databaseMaintenancePromise = null;
let databaseOperationQueue = Promise.resolve();

const waitForDatabaseMaintenance = async () => {
  while (databaseMaintenancePromise) {
    await databaseMaintenancePromise;
  }
};

const runSerializedDatabaseOperation = async (operation) => {
  const previousOperation = databaseOperationQueue;
  let releaseOperation;
  databaseOperationQueue = new Promise((resolve) => {
    releaseOperation = resolve;
  });

  await previousOperation;

  try {
    return await operation();
  } finally {
    releaseOperation();
  }
};

const isRecoverableDatabaseError = (error) => {
  const message = [
    error?.message,
    error?.cause?.message,
    error?.toString?.(),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return RECOVERABLE_DB_ERROR_PATTERNS.some((pattern) =>
    message.includes(pattern),
  );
};

const resetDatabaseConnection = async () => {
  const databaseToClose = db;
  db = null;
  openDatabasePromise = null;

  if (databaseToClose) {
    try {
      await databaseToClose.closeAsync();
    } catch (_e) {
      // The native handle may already be invalid; resetting the JS reference is enough.
    }
  }
};

const runWithDatabaseRetry = async (operation, operationName) => {
  await waitForDatabaseMaintenance();

  return runSerializedDatabaseOperation(async () => {
    try {
      const database = await openDatabase();
      return await operation(database);
    } catch (error) {
      if (!isRecoverableDatabaseError(error)) {
        throw error;
      }

      console.warn(
        `Recoverable SQLite error during ${operationName}; re-opening database and retrying once.`,
        error,
      );
      await resetDatabaseConnection();

      const database = await openDatabase();
      return operation(database);
    }
  });
};

// Initialize Database Connection
export const openDatabase = async ({ skipMaintenanceWait = false } = {}) => {
  if (!skipMaintenanceWait) {
    await waitForDatabaseMaintenance();
  }

  if (db !== null) {
    return db;
  }

  if (openDatabasePromise) {
    return openDatabasePromise;
  }

  openDatabasePromise = SQLite.openDatabaseAsync(DATABASE_NAME)
    .then((database) => {
      db = database;
      return database;
    })
    .catch((error) => {
      db = null;
      throw error;
    })
    .finally(() => {
      openDatabasePromise = null;
    });

  return openDatabasePromise;
};

export const runDatabaseMaintenance = async (operation) => {
  await waitForDatabaseMaintenance();

  let finishMaintenance;
  const activeMaintenancePromise = new Promise((resolve) => {
    finishMaintenance = resolve;
  });
  databaseMaintenancePromise = activeMaintenancePromise;

  try {
    return await operation({
      checkpointDatabase: () => checkpointDatabase({ skipMaintenanceWait: true }),
      closeDatabase: () => closeDatabase({ skipMaintenanceWait: true }),
      initDatabase: () => initDatabase({ skipMaintenanceWait: true }),
      openDatabase: () => openDatabase({ skipMaintenanceWait: true }),
    });
  } finally {
    finishMaintenance();
    if (databaseMaintenancePromise === activeMaintenancePromise) {
      databaseMaintenancePromise = null;
    }
  }
};

// Close the current database connection (needed for import/export)
export const closeDatabase = async ({ skipMaintenanceWait = false } = {}) => {
  if (!skipMaintenanceWait) {
    await waitForDatabaseMaintenance();
  }

  return runSerializedDatabaseOperation(async () => {
    if (openDatabasePromise) {
      try {
        await openDatabasePromise;
      } catch (_e) {
        // Ignore pending open failures while closing/resetting the connection.
      }
    }

    const databaseToClose = db;
    db = null;
    openDatabasePromise = null;

    if (databaseToClose !== null) {
      try {
        await databaseToClose.closeAsync();
      } catch (e) {
        console.warn("Error closing database:", e);
      }
    }
  });
};

// Flush WAL journal to the main .db file (needed before export)
export const checkpointDatabase = async ({ skipMaintenanceWait = false } = {}) => {
  try {
    if (!skipMaintenanceWait) {
      await waitForDatabaseMaintenance();
    }

    await runSerializedDatabaseOperation(async () => {
      const database = await openDatabase({ skipMaintenanceWait });
      await database.execAsync("PRAGMA wal_checkpoint(FULL);");
    });
  } catch (error) {
    console.warn("Checkpoint failed:", error);
  }
};

// Initialize Tables
export const initDatabase = async ({ skipMaintenanceWait = false } = {}) => {
  try {
    if (!skipMaintenanceWait) {
      await waitForDatabaseMaintenance();
    }

    await runSerializedDatabaseOperation(async () => {
      const database = await openDatabase({ skipMaintenanceWait });

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
        deadline_at INTEGER,
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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

      try {
        await database.execAsync(`
        ALTER TABLE tasks ADD COLUMN deadline_at INTEGER;
      `);
      } catch (_e) {
        // Abaikan bila kolom sudah ada
      }

      const tasksWithoutDeadlineAt = await database.getAllAsync(`
      SELECT id, deadline
      FROM tasks
      WHERE deadline IS NOT NULL
        AND deadline != ''
        AND deadline_at IS NULL
    `);

      for (const task of tasksWithoutDeadlineAt) {
        const deadlineAt = parseDeadlineToTimestamp(task.deadline);
        if (deadlineAt !== null) {
          await database.runAsync("UPDATE tasks SET deadline_at = ? WHERE id = ?", [
            deadlineAt,
            task.id,
          ]);
        }
      }
    });

    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Error initializing database: ", error);
    throw error;
  }
};

// ========================
// REUSABLE CRUD HELPERS
// ========================

export const fetchAll = async (query, parameters = []) => {
  try {
    return await runWithDatabaseRetry(
      (database) => database.getAllAsync(query, parameters),
      "fetchAll",
    );
  } catch (error) {
    console.error("Error fetching data: ", error);
    return [];
  }
};

export const fetchOne = async (query, parameters = []) => {
  try {
    return await runWithDatabaseRetry(
      (database) => database.getFirstAsync(query, parameters),
      "fetchOne",
    );
  } catch (error) {
    console.error("Error fetching single data: ", error);
    return null;
  }
};

export const executeWrite = async (query, parameters = []) => {
  try {
    return await runWithDatabaseRetry(
      (database) => database.runAsync(query, parameters),
      "executeWrite",
    ); // contains { changes, lastInsertRowId }
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
