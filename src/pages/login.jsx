import { useState } from "react";
import {useNavigate } from "react-router-dom";
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
 "https://habit-track-it.onrender.com/login",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  }
);

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.access_token);
        alert("Login successful");
        navigate("/dashboard");
      } else {
        alert(data.detail);
      }
    } catch (error) {
  console.error("Login error:", error);
  alert(error.message);
}
    
  };

  return (
    <div className="login-page">
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
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

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;