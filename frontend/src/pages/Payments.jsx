import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // ✅ DATE RANGE (Calendar Picker)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ method: "", status: "" });

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // ================= FETCH =================
  const fetchPayments = async () => {
    const res = await fetch("http://localhost:5000/api/payments", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setPayments(data);
    setFiltered(data);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // ================= FILTER LOGIC =================
  useEffect(() => {
    let data = [...payments];

    // Status
    if (filter !== "all") {
      data = data.filter(p => p.STATUS === filter);
    }

    // Search
    if (search) {
      data = data.filter(p =>
        p.ORDER_ID.toString().includes(search)
      );
    }

    // Date Range
    if (startDate) {
      data = data.filter(p =>
        new Date(p.CREATED_AT) >= new Date(startDate)
      );
    }

    if (endDate) {
      data = data.filter(p =>
        new Date(p.CREATED_AT) <= new Date(endDate)
      );
    }

    setFiltered(data);
  }, [filter, payments, search, startDate, endDate]);

  // ================= STATS =================
  const totalRevenue = filtered
    .filter(p => p.STATUS === "completed")
    .reduce((sum, p) => sum + p.AMOUNT, 0);

  const pendingAmount = filtered
    .filter(p => p.STATUS === "pending")
    .reduce((sum, p) => sum + p.AMOUNT, 0);

  // ================= EDIT =================
  const handleEdit = (p) => {
    setEditId(p.ID);
    setFormData({ method: p.METHOD, status: p.STATUS });
  };

  const handleUpdate = async (id) => {
    await fetch(`http://localhost:5000/api/payments/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    setEditId(null);
    fetchPayments();
  };

  // ================= EXPORT BY DATE RANGE =================
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, "payments_report.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    const tableData = filtered.map(p => [
      p.ORDER_ID,
      p.AMOUNT,
      p.METHOD,
      p.STATUS,
      p.CREATED_AT
    ]);

    doc.text("Payments Report", 14, 10);

    if (startDate || endDate) {
      doc.text(`Date Range: ${startDate || "-"} to ${endDate || "-"}`, 14, 16);
    }

    autoTable(doc, {
      head: [["Order ID", "Amount", "Method", "Status", "Date"]],
      body: tableData,
      startY: 22
    });

    doc.save("payments_report.pdf");
  };

  return (
    <Layout>
      <h2>💳 Payments Dashboard</h2>

      {/* STATS */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <div style={cardStyle}>
          <h4>Total Revenue</h4>
          <p style={{ color: "green" }}>₹{totalRevenue}</p>
        </div>

        <div style={cardStyle}>
          <h4>Pending Amount</h4>
          <p style={{ color: "orange" }}>₹{pendingAmount}</p>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        
        {/* Status */}
        <select onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>

        {/* Search */}
        <input
          placeholder="Search Order ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Calendar Picker */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {/* Reset */}
        <button onClick={() => {
          setFilter("all");
          setSearch("");
          setStartDate("");
          setEndDate("");
        }}>
          Reset
        </button>

        {/* Export */}
        <div style={{ marginLeft: "auto" }}>
          <button onClick={exportExcel}>⬇ Excel</button>
          <button onClick={exportPDF}>⬇ PDF</button>
        </div>
      </div>

      {/* SHOW SELECTED RANGE */}
      {(startDate || endDate) && (
        <p>
          📅 Showing: {startDate || "Start"} → {endDate || "End"}
        </p>
      )}

      {/* TABLE */}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((p) => (
            <tr key={p.ID}>
              <td>
                <span
                  style={{ color: "blue", cursor: "pointer" }}
                  onClick={() => navigate(`/orders/${p.ORDER_ID}`)}
                >
                  {p.ORDER_ID}
                </span>
              </td>

              <td>₹{p.AMOUNT}</td>

              <td>
                {editId === p.ID ? (
                  <select
                    value={formData.method}
                    onChange={(e) =>
                      setFormData({ ...formData, method: e.target.value })
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                  </select>
                ) : p.METHOD}
              </td>

              <td>
                {editId === p.ID ? (
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                ) : p.STATUS}
              </td>

              <td>{new Date(p.CREATED_AT).toLocaleDateString()}</td>

              <td>
                {editId === p.ID ? (
                  <>
                    <button onClick={() => handleUpdate(p.ID)}>Save</button>
                    <button onClick={() => setEditId(null)}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => handleEdit(p)}>Edit</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
};

// STYLES
const cardStyle = {
  padding: "15px",
  borderRadius: "10px",
  background: "#f5f5f5"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff"
};

export default Payments;