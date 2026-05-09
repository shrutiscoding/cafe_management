import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import "../styles/inventory.css";

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    unit: "",
    reorder_level: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // ================= FETCH =================
  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/api/inventory", {
        headers: { Authorization: "Bearer " + token },
      });

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ================= FILTER =================
  const filtered = items.filter((i) =>
    i.NAME?.toLowerCase().includes(search.toLowerCase())
  );

  // ================= SAVE =================
  const save = async () => {
    if (!form.name || !form.quantity) {
      alert("Please fill required fields");
      return;
    }

    try {
      const url = editingId
        ? `http://localhost:5000/api/inventory/${editingId}`
        : "http://localhost:5000/api/inventory";

      const method = editingId ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(form),
      });

      resetForm();
      fetchData();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  // ================= DELETE =================
  const del = async (id) => {
    if (!window.confirm("Delete this item?")) return;

    try {
      await fetch(`http://localhost:5000/api/inventory/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });

      fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // ================= EDIT =================
  const editItem = (item) => {
    setForm({
      name: item.NAME,
      quantity: item.QUANTITY,
      unit: item.UNIT,
      reorder_level: item.REORDER_LEVEL,
    });

    setEditingId(item.ID);
    setShowForm(true);
  };

  // ================= RESET =================
  const resetForm = () => {
    setForm({
      name: "",
      quantity: "",
      unit: "",
      reorder_level: "",
    });

    setEditingId(null);
    setShowForm(false);
  };

  return (
    <Layout>
      <div className="inventory-container">

        {/* ================= HEADER ================= */}
        <div className="inventory-header">
          <h1 className="page-title">Inventory</h1>

          <div className="header-actions">
            <input
              className="search-box"
              placeholder="🔍 Search item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              className="add-btn"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              + Add Item
            </button>
          </div>
        </div>

        <p className="count">Total Items: {filtered.length}</p>

        {/* ================= MODAL ================= */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-box">

              <div className="modal-header">
                <h2>{editingId ? "Update Item" : "Add Item"}</h2>
                <span className="close" onClick={resetForm}>✕</span>
              </div>

              <div className="modal-body">

                <input
                  placeholder="Item name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />

                <input
                  type="number"
                  placeholder="Quantity"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                />

                <input
                  placeholder="Unit (kg / pcs)"
                  value={form.unit}
                  onChange={(e) =>
                    setForm({ ...form, unit: e.target.value })
                  }
                />

                <input
                  type="number"
                  placeholder="Reorder level"
                  value={form.reorder_level}
                  onChange={(e) =>
                    setForm({ ...form, reorder_level: e.target.value })
                  }
                />
              </div>

              <div className="modal-footer">
                <button className="submit-btn" onClick={save}>
                  {editingId ? "Update Item" : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= GRID ================= */}
        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <p>No inventory data</p>
        ) : (
          <div className="inventory-grid">
            {filtered.map((i) => {
              const isLow =
                Number(i.QUANTITY) <= Number(i.REORDER_LEVEL);

              return (
                <div
                  key={i.ID}
                  className={`inventory-card ${isLow ? "low" : ""}`}
                >
                  <div className="card-header">
                    <h3>{i.NAME}</h3>

                    <span className={isLow ? "status low" : "status ok"}>
                      {isLow ? "⚠ Low" : "✔ OK"}
                    </span>
                  </div>

                  <div className={`qty ${isLow ? "low-text" : ""}`}>
                    {i.QUANTITY} <span>{i.UNIT}</span>
                  </div>

                  <hr />

                  <div className="card-footer">
                    <span>Min: {i.REORDER_LEVEL}</span>

                    <div>
                      <button onClick={() => editItem(i)}>✏️</button>
                      <button onClick={() => del(i.ID)}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Inventory;