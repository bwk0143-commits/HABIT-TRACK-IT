import{ useState} from "react";
import{ useNavigate} from "react-router-dom";

function Register(){
    const [name,setName] =useState("");
    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");
    const [message,setMessage]= useState("");

    const navigate = useNavigate();
    const handleRegister = async (e) => {
  e.preventDefault();

  setMessage("");

  try {
    const response = await fetch(
      "https://habit-track-it.onrender.com/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    console.log("Register status:", response.status);
    console.log("Register response:", data);

    if (response.ok) {
      setMessage("User registered successfully ✅");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } else {
      setMessage(data.detail || "Registration failed");
    }
  } catch (error) {
    console.error("Register error:", error);
    setMessage(`Error: ${error.message}`);
  }
};

    return (
        <div className="login-page">
            <h1>Create Account</h1>
            <form onSubmit={handleRegister}>
                <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                />
                <input
                type="email"
                placeholder="Email"
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
                {message && <p>{message}</p>}
                <button type="submit"> Register</button>

            </form>
        </div>
    );
}

export default Register;