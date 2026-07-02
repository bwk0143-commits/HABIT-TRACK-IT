import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar";

import "./styles/navbar.css";
import "./styles/sidebar.css";

function App() {
  return (
    <>
      <Navbar />

      <div style={{ display: "flex" }}>
        <Sidebar />

        <div style={{ padding: "30px" }}>
          <h1>Dashboard</h1>
          <p>Welcome to Habit Tracker</p>
        </div>
      </div>
    </>
  );
}

export default App;