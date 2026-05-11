import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { fetchAll, getSetting } from "../database/dbHelper";
import { parseDeadlineToTimestamp } from "../utils/dateTime";
import {
  TASK_REMINDER_CHANNEL_ID,
  getNotificationOffsetHours,
  getTaskNotificationIdentifier,
  isTaskNotificationIdentifier,
} from "../utils/notificationRules";

const ACTIVE_TASK_QUERY = `
  SELECT id, task_name, deadline, deadline_at, status
  FROM tasks
  WHERE status != 'Selesai'
    AND (deadline_at IS NOT NULL OR deadline IS NOT NULL)
`;

const getTaskDeadlineAt = (task) => {
  if (typeof task.deadline_at === "number") return task.deadline_at;
  if (task.deadline_at) return Number(task.deadline_at);
  return parseDeadlineToTimestamp(task.deadline);
};

const cancelTaskNotifications = async () => {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const taskNotifications = scheduledNotifications.filter((notification) =>
    isTaskNotificationIdentifier(notification.identifier),
  );

  await Promise.all(
    taskNotifications.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );
};

export const ensureTaskReminderChannel = async () => {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(TASK_REMINDER_CHANNEL_ID, {
    name: "Pengingat Tugas",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#4F46E5",
  });
};

export const syncTaskNotifications = async (tasksData = null) => {
  if (Platform.OS === "web") return;

  const offsetStr = await getSetting("notify_offset_hours", "24");
  const offsetHours = getNotificationOffsetHours(offsetStr);
  const tasks = tasksData || (await fetchAll(ACTIVE_TASK_QUERY));
  const now = Date.now();

  await ensureTaskReminderChannel();
  await cancelTaskNotifications();

  for (const task of tasks) {
    if (task.status === "Selesai") continue;

    const deadlineAt = getTaskDeadlineAt(task);
    if (!deadlineAt || Number.isNaN(deadlineAt)) continue;

    const notifyAt = deadlineAt - offsetHours * 60 * 60 * 1000;
    if (notifyAt <= now) continue;

    const isOneDayReminder = offsetHours === 24;
    await Notifications.scheduleNotificationAsync({
      identifier: getTaskNotificationIdentifier(task.id),
      content: {
        title: isOneDayReminder ? "Pengingat H-1 Tugas" : "Pengingat Tugas",
        body: isOneDayReminder
          ? `Jangan lupa kerjakan tugas: ${task.task_name}`
          : `${task.task_name} harus diselesaikan dalam ${offsetHours} jam.`,
        data: {
          deadlineAt,
          taskId: task.id,
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        channelId: TASK_REMINDER_CHANNEL_ID,
        date: new Date(notifyAt),
      },
    });
  }
};

export const notificationInternals = {
  getNotificationOffsetHours,
  getTaskNotificationIdentifier,
};
