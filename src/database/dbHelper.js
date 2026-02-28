import * as SQLite from "expo-sqlite";

let db = null;

// Initialize Database Concept
export const openDatabase = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("smart_study_planner.db");
  return db;
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
        semester INTEGER
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
    `);

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
    return null;
  }
};
