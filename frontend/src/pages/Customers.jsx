import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import "../styles/customers.css";

const Customers = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // ================= FETCH =================
  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/api/customers", {
        headers: { Authorization: "Bearer " + token },
      });

      const result = await res.json();
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // ================= SEARCH =================
  const filtered = data.filter((c) =>
  `${c.NAME || ""} ${c.EMAIL || ""}`
    .toLowerCase()
    .includes(search.toLowerCase())
);

  // ================= DELETE =================
  const deleteCustomer = async (id) => {
    if (!window.confirm("Delete customer?")) return;

    try {
      await fetch(`http://localhost:5000/api/customers/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });

      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      {/* HEADER */}
      <div className="customer-header">
        <h1 className="page-title">Customers</h1>

        <input
          className="search-box"
          placeholder="🔍 Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* COUNT */}
      <p className="count">
        Total Customers: <b>{filtered.length}</b>
      </p>

      {/* CONTENT */}
      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <p>No customers found</p>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joining Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c) => (
                <tr key={c.ID}>
                  <td>{c.NAME}</td>
                  <td>{c.EMAIL}</td>

                  <td>
                    {c.CREATED_AT
                      ? new Date(c.CREATED_AT).toLocaleDateString("en-IN")
                      : "—"}
                  </td>

                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => deleteCustomer(c.ID)}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default Customers;