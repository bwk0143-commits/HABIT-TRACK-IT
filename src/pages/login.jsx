import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://habit-track-it.onrender.com";

function Login({ setIsLoggedIn, setUserName }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed. Please try again.");
      }

      const name = data.name || email.split("@")[0];
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userName", name);
      if (setUserName) setUserName(name);
      if (setIsLoggedIn) setIsLoggedIn(true);

      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setMessage(error.message || "Unable to log in right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Login</h1>

        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {message ? <p className="form-message error">{message}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;