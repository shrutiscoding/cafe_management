import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // ================= FETCH =================
  const fetchProfile = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/customer/profile", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const data = await res.json();
      setUser(data);
      setForm({ name: data.name, phone: data.phone });
    } catch (err) {
      alert("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ================= UPDATE =================
  const handleUpdate = async () => {
    try {
      await fetch("http://localhost:5000/api/customer/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(form),
      });

      alert("Profile updated");
      setEdit(false);
      fetchProfile();
    } catch (err) {
      alert("Update failed");
    }
  };

  if (loading) {
    return (
      <Layout>
        <p style={{ padding: "20px" }}>Loading profile...</p>
      </Layout>
    );
  }

  return (
  <Layout>
    <div style={container}>
      <h2>👤 My Profile</h2>

      <div style={card}>
        {/* NAME */}
        <div style={row}>
          <span style={label}>Name:</span>
          {edit ? (
            <input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          ) : (
            <span style={value}>{user.name}</span>
          )}
        </div>

        {/* EMAIL */}
        <div style={row}>
          <span style={label}>Email:</span>
          <span style={value}>{user.email}</span>
        </div>

        {/* PHONE */}
        <div style={row}>
          <span style={label}>Phone:</span>
          {edit ? (
            <input
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
            />
          ) : (
            <span style={value}>{user.phone || "N/A"}</span>
          )}
        </div>

        {/* ROLE */}
        <div style={row}>
          <span style={label}>Role:</span>
          <span style={{
            ...value,
            color: user.role === "admin" ? "purple" : "gray",
            fontWeight: "bold"
          }}>
            {user.role}
          </span>
        </div>

        {/* ACTION */}
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          {edit ? (
            <>
              <button onClick={handleUpdate}>Save</button>
              <button onClick={() => setEdit(false)}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setEdit(true)}>
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  </Layout>
);
};

// ================= STYLES =================
const container = {
  padding: "20px",
};

const card = {
  background: "#fff",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  maxWidth: "400px",
};
const row = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "12px",
  alignItems: "center"
};

const label = {
  fontWeight: "600",
  color: "#555"
};

const value = {
  color: "#222"
};

export default Profile;