const DEADLINE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;

const isValidDateParts = (date, year, month, day, hours, minutes) =>
  date.getFullYear() === year &&
  date.getMonth() === month - 1 &&
  date.getDate() === day &&
  date.getHours() === hours &&
  date.getMinutes() === minutes;

const parseDeadlineToDate = (deadlineText) => {
  if (!deadlineText || typeof deadlineText !== "string") return null;

  const match = deadlineText.match(DEADLINE_PATTERN);
  if (!match) return null;

  const [, dayText, monthText, yearText, hourText, minuteText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (!isValidDateParts(date, year, month, day, hours, minutes)) return null;

  return date;
};

const parseDeadlineToTimestamp = (deadlineText) => {
  const date = parseDeadlineToDate(deadlineText);
  return date ? date.getTime() : null;
};

const formatDeadlineForDisplay = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";

  const day = value.getDate().toString().padStart(2, "0");
  const month = (value.getMonth() + 1).toString().padStart(2, "0");
  const year = value.getFullYear();
  const hours = value.getHours().toString().padStart(2, "0");
  const minutes = value.getMinutes().toString().padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

module.exports = {
  formatDeadlineForDisplay,
  parseDeadlineToDate,
  parseDeadlineToTimestamp,
};
