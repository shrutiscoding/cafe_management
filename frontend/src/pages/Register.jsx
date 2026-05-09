import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import "../styles/login.css";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // FIXED ROLE (always customer)
  const role = "customer";

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    setLoading(true);
    setMessage("");

    try {
      await axios.post("http://localhost:5000/api/register", {
        name,
        email,
        password,
        role, // always customer
      });

      setMessage("✅ Registration successful!");

      setTimeout(() => {
        navigate("/");
      }, 1500);

    } catch (err) {
      setMessage("❌ Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box animate">

        <h2>☕ Artisan Cafe</h2>
        <p className="login-sub">Create your account</p>

        {message && <p className="error">{message}</p>}

        {/* NAME */}
        <div className="input-icon">
          <FaUser />
          <input
            type="text"
            placeholder="Full Name"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </div>

        {/* EMAIL */}
        <div className="input-icon">
          <FaEnvelope />
          <input
            type="email"
            placeholder="Email Address"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>

        {/* PASSWORD */}
        <div className="input-icon">
          <FaLock />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>

        {/* INFO TEXT */}
        <p style={{ fontSize: "12px", color: "#777", marginTop: "10px" }}>
          Role will be assigned as <b>Customer</b> by default
        </p>

        {/* BUTTON */}
        <button onClick={handleRegister} disabled={loading}>
          {loading ? "Creating..." : "Register"}
        </button>

        {/* SWITCH */}
        <p style={{ marginTop: "14px", fontSize: "13px" }}>
          Already have an account?{" "}
          <span
            style={{ color: "#D85A30", cursor: "pointer", fontWeight: "500" }}
            onClick={() => navigate("/")}
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
};

export default Register;