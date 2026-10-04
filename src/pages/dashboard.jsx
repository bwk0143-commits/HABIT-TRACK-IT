import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardCard from "../components/Dashboardcard.jsx";
import { formatReminderTime } from "../utils/timezones.js";

const API_BASE = "https://habit-track-it.onrender.com";

function getZonedDateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [habits, setHabits] = useState([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("");
  const [userTimezone, setUserTimezone] = useState("Asia/Kolkata");
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [reminderDraft, setReminderDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [busyHabitId, setBusyHabitId] = useState(null);

  const profileName = localStorage.getItem("userName") || "friend";

  const fetchDashboardData = async () => {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const [statsResponse, habitsResponse] = await Promise.all([
        fetch(`${API_BASE}/dashboard`, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }),
        fetch(`${API_BASE}/habits`, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }),
      ]);

      if (statsResponse.status === 401 || habitsResponse.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userName");
        navigate("/login");
        return;
      }

      const habitsData = await habitsResponse.json();
      const statsData = statsResponse.ok ? await statsResponse.json() : {};

      if (!habitsResponse.ok) {
        throw new Error(habitsData.detail || "Unable to load your habits.");
      }

      const currentHabits = Array.isArray(habitsData) ? habitsData : [];
      const completedCount = currentHabits.filter((habit) => habit.completed === true).length;

      setStats({
        ...statsData,
        totalHabits: currentHabits.length,
        completedToday: completedCount,
        pending: currentHabits.length - completedCount,
        percentage: currentHabits.length
          ? Math.round((completedCount / currentHabits.length) * 100)
          : 0,
      });
      setHabits(currentHabits);
    } catch (error) {
      console.error("Dashboard error:", error);
      setErrorMessage(error.message || "Something went wrong while loading your dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const loadNotificationPreferences = async () => {
      const currentToken = localStorage.getItem("token");
      if (!currentToken) return;

      try {
        const response = await fetch(`${API_BASE}/settings`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("userName");
          navigate("/login");
          return;
        }
        if (!response.ok) return;

        const settings = await response.json();
        setUserTimezone(settings.timezone || "Asia/Kolkata");
      } catch (error) {
        console.error("Reminder preferences error:", error);
      }
    };

    loadNotificationPreferences();
  }, [navigate]);

  const handleAddHabit = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      setErrorMessage("Please enter a habit name.");
      return;
    }

    if (reminderEnabled && !reminderTime) {
      setErrorMessage("Choose a reminder time or turn the reminder off.");
      return;
    }

    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE}/habits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || "General",
          reminder_enabled: reminderEnabled,
          reminder_time: reminderEnabled ? reminderTime : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Habit creation failed.");
      }

      setTitle("");
      setCategory("General");
      setReminderEnabled(false);
      setReminderTime("");
      await fetchDashboardData();
    } catch (error) {
      console.error("Add habit error:", error);
      setErrorMessage(error.message || "Unable to create habit right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const beginReminderEdit = (habit) => {
    setEditingReminderId(habit.id);
    setReminderDraft({
      reminder_enabled: habit.reminder_enabled === true,
      reminder_time: habit.reminder_time || "",
    });
    setErrorMessage("");
  };

  const saveHabitReminder = async (habitId) => {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      navigate("/login");
      return;
    }
    if (reminderDraft.reminder_enabled && !reminderDraft.reminder_time) {
      setErrorMessage("Choose a reminder time or turn the reminder off.");
      return;
    }

    setBusyHabitId(habitId);
    setErrorMessage("");
    try {
      const response = await fetch(`${API_BASE}/habits/${habitId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          reminder_enabled: reminderDraft.reminder_enabled,
          reminder_time: reminderDraft.reminder_enabled ? reminderDraft.reminder_time : null,
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
        throw new Error(data.detail || "Unable to save reminder. Please try again.");
      }

      setEditingReminderId(null);
      setReminderDraft(null);
      await fetchDashboardData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to save reminder. Please try again.");
    } finally {
      setBusyHabitId(null);
    }
  };

  const handleToggleHabit = async (habit) => {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      navigate("/login");
      return;
    }

    setBusyHabitId(habit.id);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/habits/${habit.id}/${habit.completed ? "uncomplete" : "complete"}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userName");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || "Unable to update habit status.");
      }

      await fetchDashboardData();
    } catch (error) {
      console.error("Toggle habit error:", error);
      setErrorMessage(error.message || "Unable to update habit status.");
    } finally {
      setBusyHabitId(null);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      navigate("/login");
      return;
    }

    setBusyHabitId(habitId);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE}/habits/${habitId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to delete habit.");
      }

      await fetchDashboardData();
    } catch (error) {
      console.error("Delete habit error:", error);
      setErrorMessage(error.message || "Unable to delete habit.");
    } finally {
      setBusyHabitId(null);
    }
  };

  const completionPercentage = stats ? Number(stats.percentage || 0) : 0;
  const reminderNow = getZonedDateParts(new Date(), userTimezone);
  const localDate = `${reminderNow.year}-${reminderNow.month}-${reminderNow.day}`;
  const localTime = `${reminderNow.hour}:${reminderNow.minute}`;
  const upcomingReminders = habits
    .filter((habit) => {
      if (!habit.reminder_enabled || !habit.reminder_time) return false;
      if (!habit.completed) return true;
      if (!habit.completed_at) return false;
      const completedDate = getZonedDateParts(new Date(habit.completed_at), userTimezone);
      return `${completedDate.year}-${completedDate.month}-${completedDate.day}` !== localDate;
    })
    .map((habit) => ({
      ...habit,
      scheduleDay: habit.reminder_time >= localTime ? "Today" : "Tomorrow",
    }))
    .sort((first, second) => first.reminder_time.localeCompare(second.reminder_time));
  const ringStyle = {
    background: `conic-gradient(#7ef0a2 ${completionPercentage}%, rgba(255,255,255,0.12) ${completionPercentage}% 100%)`,
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <p className="section-label">Welcome back</p>
          <h1>Hello, {profileName}</h1>
        </div>

        <div className="dashboard-progress-ring" style={ringStyle}>
          <div className="dashboard-progress-inner">
            <strong>{completionPercentage}%</strong>
            <span>
              {stats?.completedToday ?? 0} / {stats?.totalHabits ?? 0} completed
            </span>
          </div>
        </div>
      </div>

      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

      <div className="dashboard-cards">
        <DashboardCard title="Total Habits" value={stats?.totalHabits ?? 0} icon="📋" />
        <DashboardCard title="Completed" value={stats?.completedToday ?? 0} icon="✅" />
        <DashboardCard title="Pending" value={stats?.pending ?? 0} icon="⏳" />
        <DashboardCard title="Current Streak" value={stats?.currentStreak ?? 0} icon="🔥" />
      </div>

      <section className="upcoming-reminders" aria-labelledby="upcoming-reminders-title">
        <div className="upcoming-reminders-header">
          <h2 id="upcoming-reminders-title">Upcoming Reminders</h2>
          <span>{upcomingReminders.length}</span>
        </div>
        {upcomingReminders.length ? (
          <ul className="upcoming-reminders-list">
            {upcomingReminders.map((habit) => (
              <li key={habit.id}>
                <span className="upcoming-reminder-name">🔔 {habit.title}</span>
                <span className="upcoming-reminder-time">
                  {habit.scheduleDay} · {formatReminderTime(habit.reminder_time)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No reminders scheduled.</p>
        )}
      </section>

      <div className="habit-panel">
        <form onSubmit={handleAddHabit} className="habit-form">
          <h3>Add a new habit</h3>
          <div className="habit-form-row">
            <input
              type="text"
              placeholder="Habit name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <label className="toggle-row reminder-toggle-row">
            <span>Reminder</span>
            <button
              type="button"
              className={`toggle ${reminderEnabled ? "on" : "off"}`}
              onClick={() => setReminderEnabled((current) => !current)}
              aria-pressed={reminderEnabled}
            >
              <span className="toggle-thumb" />
            </button>
          </label>
          {reminderEnabled ? (
            <>
              <div className="reminder-fields">
              <label className="settings-field">
                <span>Reminder Time</span>
                <input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} required />
              </label>
              </div>
            </>
          ) : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add Habit"}
          </button>
        </form>

        <div className="habit-list-panel">
          <div className="habit-list-header">
            <h3>Your habits</h3>
            <span>{habits.length} total</span>
          </div>

          {loading ? (
            <p className="empty-state">Loading habits...</p>
          ) : habits.length === 0 ? (
            <p className="empty-state">You have no habits yet. Add one to get started.</p>
          ) : (
            <div className="habit-list">
              {habits.map((habit) => (
                <div key={habit.id} className={`habit-item ${habit.completed ? "complete" : ""}`}>
                  <div className="habit-item-main">
                    <h4>{habit.title}</h4>
                    <p>{habit.category || "General"}</p>
                    <p className="habit-reminder-status">
                      {habit.reminder_enabled && habit.reminder_time
                        ? `🔔 Reminder: ${formatReminderTime(habit.reminder_time)}`
                        : "🔕 Reminder Off"}
                    </p>
                  </div>

                  <div className="habit-item-meta">
                    <span className="habit-streak">🔥 {habit.streak || 0}</span>
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => editingReminderId === habit.id ? setEditingReminderId(null) : beginReminderEdit(habit)}
                      disabled={busyHabitId === habit.id}
                    >
                      {editingReminderId === habit.id ? "Cancel" : "Edit Reminder"}
                    </button>
                    <button
                      type="button"
                      className={habit.completed ? "secondary-button small-button" : "primary-button small-button"}
                      onClick={() => handleToggleHabit(habit)}
                      disabled={busyHabitId === habit.id}
                    >
                      {busyHabitId === habit.id ? "Saving..." : habit.completed ? "Completed ✓" : "Complete"}
                    </button>
                    <button
                      type="button"
                      className="danger-button small-button"
                      onClick={() => handleDeleteHabit(habit.id)}
                      disabled={busyHabitId === habit.id}
                    >
                      Delete
                    </button>
                  </div>
                  {editingReminderId === habit.id && reminderDraft ? (
                    <div className="habit-reminder-editor">
                      <label className="toggle-row reminder-toggle-row">
                        <span>Reminder</span>
                        <button
                          type="button"
                          className={`toggle ${reminderDraft.reminder_enabled ? "on" : "off"}`}
                          onClick={() => setReminderDraft((current) => ({ ...current, reminder_enabled: !current.reminder_enabled }))}
                          aria-pressed={reminderDraft.reminder_enabled}
                        >
                          <span className="toggle-thumb" />
                        </button>
                      </label>
                      {reminderDraft.reminder_enabled ? (
                        <>
                          <div className="reminder-fields">
                          <label className="settings-field">
                            <span>Reminder Time</span>
                            <input type="time" value={reminderDraft.reminder_time} onChange={(event) => setReminderDraft((current) => ({ ...current, reminder_time: event.target.value }))} required />
                          </label>
                          </div>
                        </>
                      ) : null}
                      <button type="button" className="primary-button small-button" onClick={() => saveHabitReminder(habit.id)} disabled={busyHabitId === habit.id}>
                        {busyHabitId === habit.id ? "Saving..." : "Save Reminder"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;