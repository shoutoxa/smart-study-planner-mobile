import React from "react";
import { ScheduleWidget } from "./ScheduleWidget";
import { fetchAll } from "../database/dbHelper";

export async function widgetTaskHandler(props) {
  try {
    // Determine the current day in Indonesian (e.g., "Senin")
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const currentDay = days[new Date().getDay()];

    // Query to get today's active schedules joined with course names
    const query = `
      SELECT cs.*, c.course_name, c.lecturer_name 
      FROM class_schedules cs 
      JOIN courses c ON cs.course_id = c.id 
      WHERE cs.day_of_week = ?
      ORDER BY cs.start_time ASC
    `;

    // Fetch data using the existing dbHelper
    const scheduleData = await fetchAll(query, [currentDay]);

    switch (props.widgetAction) {
      case "WIDGET_ADDED":
      case "WIDGET_UPDATE":
      case "WIDGET_RESIZED":
        props.renderWidget(<ScheduleWidget schedules={scheduleData} />);
        break;

      default:
        break;
    }
  } catch (error) {
    console.error("Widget data fetch error:", error);
    // Render an empty state on failure
    props.renderWidget(<ScheduleWidget schedules={[]} />);
  }
}
