function DashboardCard({ title, value, icon, color }) {
  return (
    <div className="dashboard-card">
      <div className="card-top">
        <span className="icon">{icon}</span>
        <span className="title">{title}</span>
      </div>

      <h1 style={{ color }}>{value}</h1>
      <h2>karrthik</h2>
    </div>
  );
}

export default DashboardCard;