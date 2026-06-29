import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import "./styles/Navbar.css";
import "./styles/Sidebar.css";

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