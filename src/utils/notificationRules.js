const TASK_REMINDER_CHANNEL_ID = "task-reminders";
const TASK_NOTIFICATION_PREFIX = "smart-study-task";

const getTaskNotificationIdentifier = (taskId) => `${TASK_NOTIFICATION_PREFIX}-${taskId}`;

const getNotificationOffsetHours = (offsetText) => {
  const offsetHours = Number.parseInt(offsetText, 10);
  return Number.isInteger(offsetHours) && offsetHours > 0 ? offsetHours : 24;
};

const isTaskNotificationIdentifier = (identifier) =>
  typeof identifier === "string" && identifier.startsWith(TASK_NOTIFICATION_PREFIX);

module.exports = {
  TASK_NOTIFICATION_PREFIX,
  TASK_REMINDER_CHANNEL_ID,
  getNotificationOffsetHours,
  getTaskNotificationIdentifier,
  isTaskNotificationIdentifier,
};
