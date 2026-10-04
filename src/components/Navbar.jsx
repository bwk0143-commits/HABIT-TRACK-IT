import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { showBrowserNotification } from "../utils/browserNotifications.js";

const API_BASE = "https://habit-track-it.onrender.com";

function formatRelativeTime(value) {
  if (!value) return "Just now";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 60) return "Just now";
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
  if (elapsedHours < 48) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function Navbar({ isLoggedIn = false, userName = "", onLogout }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const previousNotificationIds = useRef(null);
  const refreshNotifications = useRef(null);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate("/");
  };

  const navItems = isLoggedIn
    ? [
        { to: "/", label: "Home" },
        { to: "/dashboard", label: "Dashboard" },
        { to: "/statistics", label: "Statistics" },
        { to: "/settings", label: "Settings" },
      ]
    : [
        { to: "/", label: "Home" },
        { to: "/login", label: "Login" },
      ];

  useEffect(() => {
    if (!isLoggedIn) {
      previousNotificationIds.current = null;
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    let isActive = true;
    const loadNotifications = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const [notificationResponse, settingsResponse] = await Promise.all([
          fetch(`${API_BASE}/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/settings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (notificationResponse.status === 401 || settingsResponse.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("userName");
          onLogout?.();
          navigate("/login");
          return;
        }
        if (!notificationResponse.ok || !settingsResponse.ok) {
          throw new Error("Unable to load notifications.");
        }

        const notificationData = await notificationResponse.json();
        const settings = await settingsResponse.json();
        const nextNotifications = notificationData.notifications || [];
        const nextIds = new Set(nextNotifications.map((item) => item.id));

        if (previousNotificationIds.current && settings.browser_notifications_enabled) {
          nextNotifications
            .filter((item) => !item.read && !previousNotificationIds.current.has(item.id))
            .forEach((item) => showBrowserNotification(item.title, { body: item.message }));
        }

        if (isActive) {
          previousNotificationIds.current = nextIds;
          setNotifications(nextNotifications);
          setUnreadCount(notificationData.unread_count || 0);
          setBrowserNotificationsEnabled(settings.browser_notifications_enabled === true);
          setNotificationError("");
        }
      } catch (error) {
        if (isActive) setNotificationError(error.message || "Unable to load notifications.");
      }
    };

    refreshNotifications.current = loadNotifications;
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
      refreshNotifications.current = null;
    };
  }, [isLoggedIn, navigate, onLogout]);

  const markNotificationRead = async (notificationId) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Unable to mark notification as read.");
      await refreshNotifications.current?.();
    } catch (error) {
      setNotificationError(error.message || "Unable to mark notification as read.");
    }
  };

  const markAllNotificationsRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Unable to mark notifications as read.");
      await refreshNotifications.current?.();
    } catch (error) {
      setNotificationError(error.message || "Unable to mark notifications as read.");
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <span className="logo-icon">◎</span>
        <span>Habit Tracker</span>
      </div>

      <div className="navbar-links">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (`nav-link ${isActive ? "active" : ""}`)}
          >
            {item.label}
          </NavLink>
        ))}

        {!isLoggedIn ? (
          <Link to="/register" className="nav-register-btn">
            Register
          </Link>
        ) : (
          <>
            <div className="notification-center">
              <button
                type="button"
                className="notification-bell"
                aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
                aria-expanded={isNotificationPanelOpen}
                onClick={() => setIsNotificationPanelOpen((current) => !current)}
              >
                <span aria-hidden="true">🔔</span>
                {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
              </button>
              {isNotificationPanelOpen ? (
                <section className="notification-panel" aria-label="Notifications">
                  <div className="notification-panel-header">
                    <h2>Notifications</h2>
                    <button type="button" className="notification-read-all" onClick={markAllNotificationsRead} disabled={!unreadCount}>
                      Mark all read
                    </button>
                  </div>
                  {notificationError ? <p className="notification-error">{notificationError}</p> : null}
                  {notifications.length ? (
                    <ul className="notification-list">
                      {notifications.map((notification) => (
                        <li key={notification.id} className={notification.read ? "notification-item" : "notification-item unread"}>
                          <button type="button" className="notification-item-button" onClick={() => markNotificationRead(notification.id)}>
                            <span className="notification-item-icon" aria-hidden="true">🔔</span>
                            <span className="notification-item-content">
                              <strong>{notification.title}</strong>
                              <span>{notification.message}</span>
                              <small>{formatRelativeTime(notification.created_at)}</small>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="notification-empty">No notifications yet.</p>
                  )}
                  {browserNotificationsEnabled ? <p className="notification-footnote">Browser alerts work while this app is open or in a background tab.</p> : null}
                </section>
              ) : null}
            </div>
            <Link to="/profile" className="nav-link profile-link">
              {userName || "Profile"}
            </Link>
            <button type="button" className="nav-login-btn logout-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;