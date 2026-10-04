export const TIMEZONE_GROUPS = [
  {
    label: "India",
    options: [
      { value: "Asia/Kolkata", label: "India Standard Time (IST, UTC+5:30)" },
    ],
  },
  {
    label: "United States",
    options: [
      { value: "America/New_York", label: "Eastern Time (ET)" },
      { value: "America/Chicago", label: "Central Time (CT)" },
      { value: "America/Denver", label: "Mountain Time (MT)" },
      { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    ],
  },
  {
    label: "Canada",
    options: [
      { value: "America/Toronto", label: "Eastern Time (ET)" },
      { value: "America/Vancouver", label: "Pacific Time (PT)" },
    ],
  },
  {
    label: "United Kingdom",
    options: [{ value: "Europe/London", label: "United Kingdom Time (GMT/BST)" }],
  },
  {
    label: "Europe",
    options: [{ value: "Europe/Berlin", label: "Central European Time (CET/CEST)" }],
  },
  {
    label: "Australia",
    options: [{ value: "Australia/Sydney", label: "Australian Eastern Time (AET)" }],
  },
  {
    label: "Japan",
    options: [{ value: "Asia/Tokyo", label: "Japan Standard Time (JST)" }],
  },
  {
    label: "Singapore",
    options: [{ value: "Asia/Singapore", label: "Singapore Time (SGT)" }],
  },
  {
    label: "UAE",
    options: [{ value: "Asia/Dubai", label: "Gulf Standard Time (GST)" }],
  },
];

export const TIMEZONES = TIMEZONE_GROUPS.flatMap((group) => group.options);

export function timezoneLabel(value) {
  return TIMEZONES.find((timezone) => timezone.value === value)?.label
    || "Previously saved timezone";
}

export function formatReminderTime(value) {
  if (!value) return "";

  const [hours, minutes] = value.split(":").map(Number);
  const reminderDate = new Date(Date.UTC(2020, 0, 1, hours, minutes));

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(reminderDate);
}