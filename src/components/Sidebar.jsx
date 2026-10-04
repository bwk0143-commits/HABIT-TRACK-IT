import { NavLink, useNavigate } from "react-router-dom";

function Sidebar({ userName = "", onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate("/");
  };

  const menuItems = [
    { to: "/dashboard", icon: "🏠", label: "Dashboard" },
    { to: "/statistics", icon: "📊", label: "Statistics" },
    { to: "/profile", icon: "👤", label: "Profile" },
    { to: "/settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-badge">Logged in</span>
        <h3>{userName || "Member"}</h3>
      </div>

      <ul className="sidebar-list">
        {menuItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ))}

        <li>
          <button type="button" className="sidebar-link sidebar-logout" onClick={handleLogout}>
            <span>🚪</span>
            Logout
          </button>
        </li>
      </ul>
    </aside>
  );
}

export default Sidebar;
