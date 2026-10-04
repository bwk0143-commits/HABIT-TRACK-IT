import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://habit-track-it.onrender.com";

function Statistics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const headers = { Authorization: `Bearer ${token}` };
        const [statsResponse, habitsResponse] = await Promise.all([
          fetch(`${API_BASE}/dashboard`, { headers }),
          fetch(`${API_BASE}/habits`, { headers }),
        ]);

        if (statsResponse.status === 401 || habitsResponse.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("userName");
            navigate("/login");
            return;
        }

        const statsData = await statsResponse.json();
        const habitsData = await habitsResponse.json();

        if (!statsResponse.ok) {
          throw new Error(statsData.detail || "Unable to load statistics.");
        }

        if (!habitsResponse.ok) {
          throw new Error(habitsData.detail || "Unable to load habits for statistics.");
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
      } catch (error) {
        console.error("Statistics error:", error);
        setErrorMessage(error.message || "Unable to load statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

  if (loading) {
    return <div className="stat-page"><p className="empty-state">Loading statistics...</p></div>;
  }

  if (errorMessage) {
    return (
      <div className="stat-page">
        <p className="form-message error">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="stat-page">
      <div className="section-head">
        <p className="section-label">Your progress</p>
        <h1>Statistics</h1>
      </div>

      <div className="dashboard-cards">
        <div className="dashboard-card">
          <div className="card-top">
            <span className="icon">📋</span>
            <span className="title">Total Habits</span>
          </div>
          <h2>{stats?.totalHabits ?? 0}</h2>
        </div>

        <div className="dashboard-card">
          <div className="card-top">
            <span className="icon">✅</span>
            <span className="title">Completed</span>
          </div>
          <h2>{stats?.completedToday ?? 0}</h2>
        </div>

        <div className="dashboard-card">
          <div className="card-top">
            <span className="icon">⏳</span>
            <span className="title">Pending</span>
          </div>
          <h2>{stats?.pending ?? 0}</h2>
        </div>

        <div className="dashboard-card">
          <div className="card-top">
            <span className="icon">📊</span>
            <span className="title">Completion</span>
          </div>
          <h2>{stats?.percentage ?? 0}%</h2>
        </div>

        <div className="dashboard-card">
          <div className="card-top">
            <span className="icon">🔥</span>
            <span className="title">Current Streak</span>
          </div>
          <h2>{stats?.currentStreak ?? 0}</h2>
        </div>

        <div className="dashboard-card">
          <div className="card-top">
            <span className="icon">🏆</span>
            <span className="title">Best Streak</span>
          </div>
          <h2>{stats?.bestStreak ?? 0}</h2>
        </div>
      </div>
    </div>
  );
}

export default Statistics;