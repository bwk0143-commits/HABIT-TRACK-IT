<<<<<<< HEAD
import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar";

import "./styles/navbar.css";
import "./styles/sidebar.css";
=======
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import "./styles/Navbar.css";
import "./styles/Sidebar.css";
>>>>>>> 0141c175c9c7a496f7cc83e4b50281253c78abc0

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
