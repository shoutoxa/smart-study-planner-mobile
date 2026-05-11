const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

const parseTimeToMinutes = (timeText) => {
  if (!timeText || typeof timeText !== "string") return null;

  const match = timeText.match(TIME_PATTERN);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
};

const hasTimeRangeConflict = (candidate, schedules) => {
  const candidateStart = parseTimeToMinutes(candidate.startTime);
  const candidateEnd = parseTimeToMinutes(candidate.endTime);

  if (candidateStart === null || candidateEnd === null || candidateEnd <= candidateStart) {
    return false;
  }

  return schedules.some((schedule) => {
    if (schedule.id && candidate.ignoreId && schedule.id === candidate.ignoreId) {
      return false;
    }

    if (schedule.day_of_week !== candidate.dayOfWeek) {
      return false;
    }

    const scheduleStart = parseTimeToMinutes(schedule.start_time);
    const scheduleEnd = parseTimeToMinutes(schedule.end_time);

    if (scheduleStart === null || scheduleEnd === null || scheduleEnd <= scheduleStart) {
      return false;
    }

    return scheduleStart < candidateEnd && scheduleEnd > candidateStart;
  });
};

module.exports = {
  hasTimeRangeConflict,
  parseTimeToMinutes,
};
