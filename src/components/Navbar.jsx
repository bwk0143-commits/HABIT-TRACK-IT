import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo"></div>

      <div className="navbar-links">
        <Link to="/" className="nav-link">Home</Link>
        <a href="#" className="nav-link">Dashboard</a>
        <a href="#" className="nav-link">Statistics</a>

        <Link to="/login" className="nav-login-btn">
          Login
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;