import { useEffect, useState } from "react";
import DashboardCard from "../components/Dashboardcard.jsx";

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(
          "https://habit-track-it.onrender.com/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStats(data);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      }
    };

    fetchDashboard();
  }, []);

  if (!stats) {
    return <h2 style={{ color: "white" }}>Loading dashboard...</h2>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <div className="dashboard-cards">
        <DashboardCard
          title="Total Habits"
          value={stats.totalHabits}
          icon="📋"
        />

        <DashboardCard
          title="Completed"
          value={stats.completedToday}
          icon="✅"
        />

        <DashboardCard
          title="Pending"
          value={stats.pending}
          icon="⏳"
        />

        <DashboardCard
          title="Completion"
          value={`${stats.percentage}%`}
          icon="📊"
        />
      </div>
    </div>
  );
}

export default Dashboard;