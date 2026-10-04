import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/login.jsx";
import Dashboard from "./pages/dashboard.jsx";
import Register from "./pages/register.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Statistics from "./pages/Statistics.jsx";
import Settings from "./pages/Settings.jsx";
import Profile from "./pages/Profile.jsx";
import "./index.css";
import "./styles/Navbar.css";
import "./styles/Dashboard.css";
import "./styles/Sidebar.css";

const API_BASE = "https://habit-track-it.onrender.com";

const habits = [
  {
    title: "Morning Workout",
    icon: "🏃",
    image:
      "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=900&q=80",
    tasks: ["Exercise for 20 minutes", "Stretch for 5 minutes"],
    streak: 12,
  },
  {
    title: "Read Every Day",
    icon: "📚",
    image:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80",
    tasks: ["Read 10 pages", "Write one useful note"],
    streak: 8,
  },
  {
    title: "Drink Water",
    icon: "💧",
    image:
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80",
    tasks: ["Drink 8 glasses", "Refill bottle at lunch"],
    streak: 15,
  },
  {
    title: "Sleep on Time",
    icon: "🌙",
    image:
      "https://images.unsplash.com/photo-1455642305367-68834a36c47e?auto=format&fit=crop&w=900&q=80",
    tasks: ["Avoid phone after 10 PM", "Sleep before 11 PM"],
    streak: 6,
  },
  {
    title: "Daily Meditation",
    icon: "🧘",
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
    tasks: ["Meditate for 10 minutes", "Take 3 mindful breaths"],
    streak: 10,
  },
];

function AppLayout({ children, isLoggedIn, userName, onLogout }) {
  return (
    <div className="app-shell">
      <Navbar isLoggedIn={isLoggedIn} userName={userName} onLogout={onLogout} />
      {isLoggedIn ? (
        <div className="app-content">
          <Sidebar onLogout={onLogout} userName={userName} />
          <div className="page-shell">{children}</div>
        </div>
      ) : (
        <div className="page-shell">{children}</div>
      )}
    </div>
  );
}

function ProtectedRoute({ isLoggedIn, children }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function Home() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % habits.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const startX = useRef(null);

  const move = (direction) => {
    setActive((current) => (current + direction + habits.length) % habits.length);
  };

  const handlePointerDown = (event) => {
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  useEffect(() => {
    const handleKeyboard = (event) => {
      if (event.key === "ArrowLeft") {
        move(-1);
      }

      if (event.key === "ArrowRight") {
        move(1);
      }
    };

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, []);

  const handlePointerUp = (event) => {
    if (startX.current === null) return;

    const difference = event.clientX - startX.current;

    if (difference > 50) {
      move(-1);
    } else if (difference < -50) {
      move(1);
    }

    startX.current = null;
  };

  const isLoggedIn = Boolean(localStorage.getItem("token"));

  return (
    <main className="app">
      <header className="home-header">
        <p>Build better habits</p>
        <h1>My Daily Habits</h1>
      </header>

      <section
        className="carousel"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          startX.current = null;
        }}
      >
        {habits.map((habit, index) => {
          let difference = index - active;

          if (difference > habits.length / 2) difference -= habits.length;
          if (difference < -habits.length / 2) difference += habits.length;

          return (
            <article
              className={`habit-card ${difference === 0 ? "active" : ""}`}
              key={habit.title}
              style={{
                transform: `translateX(${difference * 260}px) translateZ(${Math.abs(difference) * -220}px) rotateY(${difference * -30}deg)`,
                opacity: Math.abs(difference) > 2 ? 0 : 1,
                zIndex: habits.length - Math.abs(difference),
              }}
              onClick={() => setActive(index)}
            >
              <img src={habit.image} alt={habit.title} />
              <div className="overlay" />

              <div className="card-content">
                <span className="icon">{habit.icon}</span>

                <div className="habit-info">
                  <small>DAILY HABIT</small>
                  <h2>{habit.title}</h2>

                  <ul>
                    {habit.tasks.map((task, taskIndex) => (
                      <li key={task}>
                        <span>{taskIndex === 0 ? "✓" : ""}</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="streak">🔥 {habit.streak} days</div>
              </div>
            </article>
          );
        })}
      </section>

      <nav className="controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous habit">
          ←
        </button>

        <div className="dots">
          {habits.map((habit, index) => (
            <button
              key={habit.title}
              type="button"
              className={index === active ? "selected" : ""}
              onClick={() => setActive(index)}
              aria-label={`Show ${habit.title}`}
            />
          ))}
        </div>

        <button type="button" onClick={() => move(1)} aria-label="Next habit">
          →
        </button>
      </nav>

      <div className="home-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() => navigate(isLoggedIn ? "/dashboard" : "/login")}
        >
          {isLoggedIn ? "Start Tracking" : "Start Tracking"}
        </button>
        <button type="button" className="secondary-button" onClick={() => navigate(isLoggedIn ? "/dashboard" : "/register")}>
          {isLoggedIn ? "View Progress" : "Register"}
        </button>
        {!isLoggedIn ? (
          <button type="button" className="ghost-button" onClick={() => navigate("/login")}>
            Login
          </button>
        ) : null}
      </div>
    </main>
  );
}

const basename = window.location.pathname.startsWith("/HABIT-TRACK-IT")
  ? "/HABIT-TRACK-IT"
  : "/";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem("token")));
  const [userName, setUserName] = useState(() => localStorage.getItem("userName") || "");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsLoggedIn(false);
      setUserName("");
      return;
    }

    const loadUser = async () => {
      try {
        const response = await fetch(`${API_BASE}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const safeName = data.name || localStorage.getItem("userName") || "User";
          localStorage.setItem("userName", safeName);
          setUserName(safeName);
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("userName");
          setIsLoggedIn(false);
          setUserName("");
        }
      } catch (error) {
        console.error("User profile load failed:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("userName");
        setIsLoggedIn(false);
        setUserName("");
      }
    };

    loadUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    setIsLoggedIn(false);
    setUserName("");
  };

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route
          path="/"
          element={
            <AppLayout isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout}>
              <Home />
            </AppLayout>
          }
        />
        <Route
          path="/login"
          element={
            <AppLayout isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout}>
              <Login setIsLoggedIn={setIsLoggedIn} setUserName={setUserName} />
            </AppLayout>
          }
        />
        <Route
          path="/register"
          element={
            <AppLayout isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout}>
              <Register />
            </AppLayout>
          }
        />
        <Route
          path="/verify-email"
          element={
            <AppLayout isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout}>
              <VerifyEmail />
            </AppLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <AppLayout isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout}>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <AppLayout isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout}>
                <Statistics />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <AppLayout isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout}>
                <Profile />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <AppLayout isLoggedIn={isLoggedIn} userName={userName} onLogout={handleLogout}>
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}