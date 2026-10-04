import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_BASE = "https://habit-track-it.onrender.com";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email address...");
  const hasStarted = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }

    if (hasStarted.current) return;
    hasStarted.current = true;

    const verifyEmail = async () => {
      try {
        const response = await fetch(`${API_BASE}/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "This verification link is invalid or expired.");
        }

        setStatus("success");
        setMessage(data.message || "Email verified. You can now log in.");
      } catch (error) {
        setStatus("error");
        setMessage(error.message || "Unable to verify this email address.");
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{status === "success" ? "Email verified" : "Email verification"}</h1>
        <p className={`form-message ${status === "error" ? "error" : "success"}`}>
          {message}
        </p>
        {status === "success" ? (
          <Link className="primary-button" to="/login">Go to Login</Link>
        ) : null}
      </div>
    </div>
  );
}

export default VerifyEmail;