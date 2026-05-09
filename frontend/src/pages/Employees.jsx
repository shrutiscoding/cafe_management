import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import "../styles/inventory.css";

const Employees = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  // 🔥 NEW STATES
  const [sortOrder, setSortOrder] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    salary: "",
    branch: "",
    hire_date: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // ================= FETCH =================
  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/api/employees", {
        headers: { Authorization: "Bearer " + token },
      });

      if (res.status === 401) {
        alert("Unauthorized! Login as admin.");
        return;
      }

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ================= FILTER + SORT =================
  const filtered = items
  .filter((e) =>
    e.NAME?.toLowerCase().includes(search.toLowerCase())
  )
  .filter((e) =>
    roleFilter
      ? e.ROLE?.trim().toLowerCase() === roleFilter.trim().toLowerCase()
      : true
  )
  .filter((e) =>
    branchFilter
      ? e.BRANCH?.trim().toLowerCase() === branchFilter.trim().toLowerCase()
      : true
  )
  .sort((a, b) => {
    if (sortOrder === "high") return b.SALARY - a.SALARY;
    if (sortOrder === "low") return a.SALARY - b.SALARY;
    return 0;
  });

  // ================= SAVE =================
  const save = async () => {
    if (!form.name || !form.email || !form.password) {
      alert("Fill required fields");
      return;
    }

    try {
      await fetch("http://localhost:5000/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(form),
      });

      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // ================= DELETE =================
  const del = async (id) => {
    if (!window.confirm("Delete employee?")) return;

    try {
      await fetch(`http://localhost:5000/api/employees/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });

      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // ================= EDIT =================
  const editItem = (e) => {
    setForm({
      name: e.NAME || "",
      email: "",
      password: "",
      role: e.ROLE || "",
      salary: e.SALARY || "",
      branch: e.BRANCH || "",
      hire_date: e.HIRE_DATE ? e.HIRE_DATE.split("T")[0] : "",
    });

    setEditingId(e.ID);
    setShowForm(true);
  };

  // ================= RESET =================
  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "",
      salary: "",
      branch: "",
      hire_date: "",
    });

    setEditingId(null);
    setShowForm(false);
  };

  return (
    <Layout>
      {/* HEADER */}
      <div className="inventory-header modern-header">
  <h1 className="page-title">Employees</h1>

  <div className="toolbar">

    <input
      className="search-box"
      placeholder="Search employee..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
      <option value="">All Roles</option>
      <option value="manager">Manager</option>
      <option value="employee">Employee</option>
    </select>

    <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
      <option value="">All Branches</option>
      <option value="kolhapur">Kolhapur</option>
      <option value="pune">Pune</option>
    </select>

    <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
      <option value="">Sort Salary</option>
      <option value="high">High → Low</option>
      <option value="low">Low → High</option>
    </select>

    <button
      className="add-btn modern-add"
      onClick={() => {
        resetForm();
        setShowForm(true);
      }}
    >
      + Add Employee
    </button>

  </div>
</div>

      <p className="count">Total Employees: {filtered.length}</p>

      {/* MODAL */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Add Employee</h2>
              <span className="close" onClick={resetForm}>✕</span>
            </div>

            <div className="modal-body">
              <input placeholder="Name"
                value={form.name}
                onChange={(e)=>setForm({...form,name:e.target.value})}
              />

              <input placeholder="Email"
                value={form.email}
                onChange={(e)=>setForm({...form,email:e.target.value})}
              />

              <input type="password" placeholder="Password"
                value={form.password}
                onChange={(e)=>setForm({...form,password:e.target.value})}
              />

              <input placeholder="Role"
                value={form.role}
                onChange={(e)=>setForm({...form,role:e.target.value})}
              />

              <input placeholder="Salary"
                value={form.salary}
                onChange={(e)=>setForm({...form,salary:e.target.value})}
              />

              <input placeholder="Branch"
                value={form.branch}
                onChange={(e)=>setForm({...form,branch:e.target.value})}
              />

              <input type="date"
                value={form.hire_date}
                onChange={(e)=>setForm({...form,hire_date:e.target.value})}
              />
            </div>

            <div className="modal-footer">
              <button className="submit-btn" onClick={save}>
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRID */}
      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <p>No employees found</p>
      ) : (
        <div className="inventory-grid">
          {filtered.map((e) => (
            <div key={e.ID} className="inventory-card">

              <div className="card-header">
                <h3>{e.NAME}</h3>
                <span className="status ok">👨‍💼</span>
              </div>

              {/* 💰 SALARY FORMAT */}
              <div className="qty">
                ₹{e.SALARY ? Number(e.SALARY).toLocaleString("en-IN") : 0}
              </div>

              <p className="emp-meta">
                {e.ROLE} • {e.BRANCH}
              </p>

              <hr />

              <div className="card-footer">
                <span>
                  {new Date(e.HIRE_DATE).toLocaleDateString()}
                </span>

                <div>
                  <button onClick={() => editItem(e)}>✏️</button>
                  <button onClick={() => del(e.ID)}>🗑</button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Employees;