export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return { supported: false, permission: "unsupported" };
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    return { supported: true, permission };
  }

  return { supported: true, permission: Notification.permission };
}

export function showBrowserNotification(title, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}