import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

 const handleLogin = async () => {
  setError("");
  setLoading(true);

  try {
    const res = await axios.post("http://localhost:5000/api/login", {
      email,
      password,
    });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("role", res.data.role);
    localStorage.setItem("userId", res.data.userId); // ✅ FIX

    console.log("UserID:", res.data.userId); // 🔍 debug

    alert("Login successful!");

    navigate("/dashboard");

  } catch (err) {
    setError("Invalid email or password");
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="login-container">
      <div className="login-box animate">
        <h2>☕ Artisan Cafe</h2>
        <p className="login-sub">Login</p>

        {error && <p className="error">{error}</p>}

        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <button onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={{ marginTop: "12px", fontSize: "13px" }}>
          Don’t have an account?{" "}
          <span
            style={{ color: "#D85A30", cursor: "pointer" }}
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;