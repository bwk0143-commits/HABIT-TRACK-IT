import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TIMEZONE_GROUPS } from "../utils/timezones.js";
import { requestNotificationPermission } from "../utils/browserNotifications.js";

const API_BASE = "https://habit-track-it.onrender.com";
const DEFAULT_SETTINGS = {
  in_app_notifications_enabled: true,
  browser_notifications_enabled: false,
  timezone: "Asia/Kolkata",
};

function Settings() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [preferences, setPreferences] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const loadSettings = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("userName");
          navigate("/login");
          return;
        }
        if (!response.ok) {
          throw new Error(data.detail || "Unable to load notification settings.");
        }
        setPreferences({ ...DEFAULT_SETTINGS, ...data });
      } catch (error) {
        setErrorMessage(error.message || "Unable to load notification settings.");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [navigate]);

  const setPreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setStatusMessage("");
    setErrorMessage("");
  };

  const toggleBrowserNotifications = async () => {
    const enabled = !preferences.browser_notifications_enabled;
    if (enabled) {
      const result = await requestNotificationPermission();
      if (!result.supported) {
        setErrorMessage("This browser does not support notifications.");
        return;
      }
      if (result.permission !== "granted") {
        setErrorMessage(result.permission === "denied"
          ? "Notifications are blocked. Enable them in your browser site settings, then try again."
          : "Browser notification permission was not granted.");
        return;
      }
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          in_app_notifications_enabled: preferences.in_app_notifications_enabled,
          browser_notifications_enabled: enabled,
          timezone: preferences.timezone,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userName");
        navigate("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(data.detail || "Unable to save browser notification settings.");
      }
      setPreferences({ ...DEFAULT_SETTINGS, ...data });
      setStatusMessage(enabled ? "Browser notifications enabled." : "Browser notifications disabled.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to save browser notification settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          in_app_notifications_enabled: preferences.in_app_notifications_enabled,
          browser_notifications_enabled: preferences.browser_notifications_enabled,
          timezone: preferences.timezone,
        }),
      });
      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userName");
        navigate("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(data.detail || "Unable to save notification settings. Please try again.");
      }

      setPreferences({ ...DEFAULT_SETTINGS, ...data });
      setStatusMessage("Notification settings saved.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to save notification settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="section-head">
        <p className="section-label">Preferences</p>
        <h1>Settings</h1>
      </div>

      <div className="settings-card">
        <h3>Appearance</h3>
        <div className="settings-actions">
          <button
            type="button"
            className={theme === "light" ? "primary-button" : "secondary-button"}
            onClick={() => setTheme("light")}
          >
            Light Mode
          </button>
          <button
            type="button"
            className={theme === "dark" ? "primary-button" : "secondary-button"}
            onClick={() => setTheme("dark")}
          >
            Dark Mode
          </button>
        </div>
      </div>

      <form className="settings-card notification-settings" onSubmit={savePreferences}>
        <h3>Notifications</h3>
        {isLoading ? <p className="empty-state">Loading notification settings...</p> : (
          <>
            <label className="toggle-row">
              <span>In-App Notifications</span>
              <button type="button" className={`toggle ${preferences.in_app_notifications_enabled ? "on" : "off"}`} onClick={() => setPreference("in_app_notifications_enabled", !preferences.in_app_notifications_enabled)} aria-pressed={preferences.in_app_notifications_enabled}>
                <span className="toggle-thumb" />
              </button>
            </label>
            <label className="toggle-row">
              <span>Browser Notifications</span>
              <button type="button" className={`toggle ${preferences.browser_notifications_enabled ? "on" : "off"}`} onClick={toggleBrowserNotifications} aria-pressed={preferences.browser_notifications_enabled} disabled={isSaving}>
                <span className="toggle-thumb" />
              </button>
            </label>
            <p className="notification-note">Get reminders while Habit Tracker is open or running in a background tab. Notifications are not guaranteed when the browser is closed.</p>
            <label className="settings-field">
              <span>Timezone</span>
              <select value={preferences.timezone} onChange={(event) => setPreference("timezone", event.target.value)}>
                {TIMEZONE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((timezone) => (
                      <option key={timezone.value} value={timezone.value}>{timezone.label}</option>
                    ))}
                  </optgroup>
                ))}
                {!TIMEZONE_GROUPS.some((group) => group.options.some((timezone) => timezone.value === preferences.timezone)) ? (
                  <option value={preferences.timezone}>Previously saved timezone</option>
                ) : null}
              </select>
            </label>
            {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
            {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Notification Settings"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default Settings;