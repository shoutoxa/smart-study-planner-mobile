const assert = require("node:assert/strict");
const {
  formatDeadlineForDisplay,
  parseDeadlineToDate,
  parseDeadlineToTimestamp,
} = require("../src/utils/dateTime");
const {
  hasTimeRangeConflict,
  parseTimeToMinutes,
} = require("../src/utils/timeRange");
const {
  TASK_REMINDER_CHANNEL_ID,
  getNotificationOffsetHours,
  getTaskNotificationIdentifier,
  isTaskNotificationIdentifier,
} = require("../src/utils/notificationRules");

const timestamp = parseDeadlineToTimestamp("09/05/2026 14:30");
assert.equal(typeof timestamp, "number");
assert.equal(formatDeadlineForDisplay(timestamp), "09/05/2026 14:30");

const parsed = parseDeadlineToDate("01/12/2026 08:05");
assert.equal(parsed.getFullYear(), 2026);
assert.equal(parsed.getMonth(), 11);
assert.equal(parsed.getDate(), 1);
assert.equal(parsed.getHours(), 8);
assert.equal(parsed.getMinutes(), 5);

assert.equal(parseDeadlineToTimestamp("31/02/2026 10:00"), null);
assert.equal(parseDeadlineToTimestamp("2026-05-09T14:30:00"), null);
assert.equal(formatDeadlineForDisplay("not-a-date"), "");

assert.equal(parseTimeToMinutes("07:30"), 450);
assert.equal(parseTimeToMinutes("24:00"), null);
assert.equal(parseTimeToMinutes("9:00"), null);

const schedules = [
  { id: 1, day_of_week: "Senin", start_time: "08:00", end_time: "09:30" },
  { id: 2, day_of_week: "Senin", start_time: "10:00", end_time: "11:00" },
  { id: 3, day_of_week: "Selasa", start_time: "08:30", end_time: "09:00" },
];

assert.equal(
  hasTimeRangeConflict(
    { dayOfWeek: "Senin", startTime: "09:15", endTime: "10:15" },
    schedules,
  ),
  true,
);
assert.equal(
  hasTimeRangeConflict(
    { dayOfWeek: "Senin", startTime: "09:30", endTime: "10:00" },
    schedules,
  ),
  false,
);
assert.equal(
  hasTimeRangeConflict(
    { dayOfWeek: "Senin", startTime: "08:30", endTime: "09:00", ignoreId: 1 },
    schedules,
  ),
  false,
);

assert.equal(TASK_REMINDER_CHANNEL_ID, "task-reminders");
assert.equal(getTaskNotificationIdentifier(42), "smart-study-task-42");
assert.equal(isTaskNotificationIdentifier("smart-study-task-42"), true);
assert.equal(isTaskNotificationIdentifier("other-notification"), false);
assert.equal(getNotificationOffsetHours("12"), 12);
assert.equal(getNotificationOffsetHours("0"), 24);
assert.equal(getNotificationOffsetHours("not-a-number"), 24);

console.log("date, time range, and notification rule tests passed");
