function DashboardCard({ title, value, icon }) {
  return (
    <div className="dashboard-card">
      <div className="card-top">
        <span className="icon">{icon}</span>
        <span className="title">{title}</span>
      </div>

      <h2>{value}</h2>
    </div>
  );
}

export default DashboardCard;