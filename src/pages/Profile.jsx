import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://habit-track-it.onrender.com";

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(`${API_BASE}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("userName");
            navigate("/login");
            return;
          }

          throw new Error(data.detail || "Unable to load your profile.");
        }

        setProfile(data);
      } catch (error) {
        console.error("Profile error:", error);
        setErrorMessage(error.message || "Unable to load your profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  if (loading) {
    return <div className="settings-page"><p className="empty-state">Loading profile...</p></div>;
  }

  return (
    <div className="settings-page">
      <div className="section-head">
        <p className="section-label">Account</p>
        <h1>Profile</h1>
      </div>

      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

      <div className="settings-card profile-card">
        <div className="profile-avatar">{(profile?.name || "U").charAt(0).toUpperCase()}</div>
        <div>
          <h3>{profile?.name || localStorage.getItem("userName") || "User"}</h3>
          <p>{profile?.email || "No email available"}</p>
        </div>
      </div>
    </div>
  );
}

export default Profile;