import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import "../styles/menu.css";

const Menu = () => {
  const role = localStorage.getItem("role");
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [cart, setCart] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    image: ""
  });

  // ✅ ADD HERE
  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      category: "",
      image: ""
    });
    setEditMode(false);
    setEditId(null);
  };

  const isAdminOrEmployee = role === "admin" || role === "employee";

  // ================= FETCH MENU =================
  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/menu");
      const data = await res.json();
      setMenu(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();

    // load cart from localStorage
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // ================= CART FUNCTION =================
 const addToCart = async (item) => {
  try {
    const customer_id = localStorage.getItem("userId");

    if (!customer_id) {
      alert("Please login first");
      return;
    }

    const res = await fetch("http://localhost:5000/api/cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customer_id,
        item_id: item._id,   // Oracle/Mongo mismatch safe fallback
        item_name: item.name,
        price: item.price,
        quantity: 1,
        image: item.image
      })
    });

    if (!res.ok) throw new Error("Failed to add");

    alert("Added to cart ✅");

    window.dispatchEvent(new Event("cartUpdated"));

  } catch (err) {
    console.error(err);
    alert("Error adding to cart ❌");
  }
};
  // ================= ADD =================
  const addItem = async () => {
    await fetch("http://localhost:5000/api/menu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        availability: true
      })
    });

    setShowModal(false);
    resetForm();
    fetchMenu();
  };

  // ================= EDIT =================
  const openEdit = (item) => {
    if (!isAdminOrEmployee) return;

    setShowModal(true);
    setEditMode(true);
    setEditId(item._id);

    setForm({
      name: item.name,
      price: item.price,
      category: item.category,
      image: item.image
    });
  };

  const updateItem = async () => {
    await fetch(`http://localhost:5000/api/menu/${editId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        ...form,
        price: Number(form.price)
      })
    });
console.log("Sending ID:", editId);
    setShowModal(false);
    resetForm();
    fetchMenu();
  };

  // ================= TOGGLE =================
  const toggleAvailability = async (item) => {
    if (!isAdminOrEmployee) return;

    await fetch(`http://localhost:5000/api/menu/${item._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        availability: !item.availability
      })
    });

    fetchMenu();
  };

  // ================= DELETE =================
  const deleteItem = async (id) => {
    if (!isAdminOrEmployee) return;

    await fetch(`http://localhost:5000/api/menu/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    fetchMenu();
  };

  // ================= FILTER =================
  const filteredMenu = menu.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) &&
    (category === "All" || item.category === category)
  );

  const categories = ["All", ...new Set(menu.map((m) => m.category))];

  return (
    <Layout>
      <div className="menu-container">

        {/* HEADER */}
        <div className="menu-header">
         <h2>🍽️ Menu Management ({filteredMenu.length})</h2>

          <div className="menu-actions">

            <input
              type="text"
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="menu-search"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="menu-select"
            >
              {categories.map((cat, i) => (
                <option key={i}>{cat}</option>
              ))}
            </select>

            {isAdminOrEmployee && (
              <button
                className="add-item-btn"
                onClick={() => setShowModal(true)}
              >
                + Add Item
              </button>
            )}

          </div>
        </div>

        {/* LOADING */}
        {loading && <p>Loading menu...</p>}

        {/* GRID */}
        <div className="menu-grid">
          {filteredMenu.map((item) => (
            <div
              key={item._id}
              className="menu-card"
              onDoubleClick={() => openEdit(item)}
              style={{ cursor: isAdminOrEmployee ? "pointer" : "default" }}
            >

              <img
                src={item.image || "https://via.placeholder.com/200"}
                className="menu-image"
                alt={item.name}
              />

              <div className="card-header">
                <h3>{item.name}</h3>
                <p className="price">₹ {item.price}</p>
              </div>

              <p className="description">
                {item.description || "No description available"}
              </p>

              <hr />

              <div className="card-footer">

                <span className="category">{item.category}</span>

                <div className="actions">

                 {isAdminOrEmployee && (
  <label className="switch">
    <input
      type="checkbox"
      checked={item.availability}
      onChange={() => toggleAvailability(item)}
    />
    <span className="slider"></span>
  </label>
)}
                    

                  {/* 🛒 ADD TO CART */}
                  <button
                    className="cart-btn"
                    onClick={() => addToCart(item)}
                  >
                    🛒
                  </button>

                  {isAdminOrEmployee && (
                    <button
                      className="delete-btn"
                      onClick={() => deleteItem(item._id)}
                    >
                      🗑
                    </button>
                  )}

                </div>

              </div>
            </div>
          ))}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="modal">
            <div className="modal-box">

              <h3>{editMode ? "Edit Item" : "Add Item"}</h3>

              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />

              <input
                placeholder="Price"
                type="number"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
              />

              <input
                placeholder="Category"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              />

              <input
                placeholder="Image URL"
                value={form.image}
                onChange={(e) =>
                  setForm({ ...form, image: e.target.value })
                }
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="add-item-btn"
                  onClick={editMode ? updateItem : addItem}
                >
                  {editMode ? "Update" : "Save"}
                </button>

                <button
                  className="delete-btn"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Menu;