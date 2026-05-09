import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const OrderDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`http://localhost:5000/api/orders/details/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [id]);

  if (!data) return <Layout>Loading...</Layout>;

  const { order, items, payment } = data;

  // ================= PDF =================
 const generatePDF = () => {
  const doc = new jsPDF();

  // ================= HEADER =================
  doc.setFillColor(40, 40, 40);
  doc.rect(0, 0, 210, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("☕ Artisan Cafe", 14, 18);

  doc.setFontSize(11);
  doc.text("Payment Receipt", 150, 18);

  // Reset color
  doc.setTextColor(0, 0, 0);

  // ================= CUSTOMER + ORDER =================
  doc.setFontSize(11);

  // LEFT SIDE
  doc.text(`Order ID: ${order.ID}`, 14, 40);
  doc.text(`Date: ${new Date(order.CREATED_AT).toLocaleDateString()}`, 14, 48);
  doc.text(`Status: ${order.STATUS}`, 14, 56);

  // RIGHT SIDE
  doc.text(`Customer:`, 130, 40);
  doc.text(`${order.CUSTOMER_NAME}`, 130, 48);
  doc.text(`${order.CUSTOMER_EMAIL}`, 130, 56);

  // ================= TABLE =================
  const tableData = items.map(item => [
    item.ITEM_NAME,
    item.QUANTITY,
    `₹${item.UNIT_PRICE}`,
    `₹${item.QUANTITY * item.UNIT_PRICE}`
  ]);

  autoTable(doc, {
    startY: 65,
    head: [["Item", "Qty", "Price", "Total"]],
    body: tableData,

    theme: "grid",

    styles: {
      fontSize: 10,
      cellPadding: 4,
      halign: "center"
    },

    headStyles: {
      fillColor: [50, 50, 50],
      textColor: 255,
      fontStyle: "bold"
    },

    columnStyles: {
      0: { halign: "left" } // Item name left aligned
    }
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // ================= TOTAL BOX =================
  doc.setDrawColor(0);
  doc.rect(120, finalY - 5, 70, 20);

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(`Total: ₹${order.TOTAL}`, 125, finalY + 5);

  // ================= PAYMENT =================
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");

  if (payment) {
    doc.text(`Method: ${payment.METHOD}`, 14, finalY + 10);
    doc.text(`Status: ${payment.STATUS}`, 14, finalY + 18);
  }

  // ================= FOOTER =================
  doc.setDrawColor(200);
  doc.line(14, 280, 196, 280);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Thank you for your purchase!", 14, 287);
  doc.text("Visit Again ☕", 150, 287);

  // ================= SAVE =================
  doc.save(`receipt_${order.ID}.pdf`);
};
  return (
    <Layout>
      <div style={receiptBox}>
        
        {/* HEADER */}
        <div style={header}>
          <h2>☕ Artisan Cafe</h2>
          <button onClick={generatePDF} style={btn}>
            📄 Download Receipt
          </button>
        </div>

        <h3 style={{ textAlign: "center" }}>Payment Receipt</h3>

        {/* INFO ROW */}
        <div style={row}>
          <div>
            <p><b>Order ID:</b> {order.ID}</p>
            <p><b>Date:</b> {new Date(order.CREATED_AT).toLocaleDateString()}</p>
          </div>

          <div style={{ textAlign: "right" }}>
            <p><b>{order.CUSTOMER_NAME}</b></p>
            <p>{order.CUSTOMER_EMAIL}</p>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table style={table}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.ITEM_NAME}</td>
                <td>{item.QUANTITY}</td>
                <td>₹{item.UNIT_PRICE}</td>
                <td>₹{item.QUANTITY * item.UNIT_PRICE}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTAL */}
        <div style={totalBox}>
          <h3>Total: ₹{order.TOTAL}</h3>
        </div>

        {/* PAYMENT */}
        <div style={paymentBox}>
          <p><b>Payment Method:</b> {payment?.METHOD || "N/A"}</p>
          <p><b>Status:</b> 
            <span style={{
              marginLeft: "10px",
              color: payment?.STATUS === "completed" ? "green" : "orange"
            }}>
              {payment?.STATUS}
            </span>
          </p>
        </div>

      </div>
    </Layout>
  );
};

// ================= STYLES =================

const receiptBox = {
  maxWidth: "700px",
  margin: "auto",
  background: "#fff",
  padding: "25px",
  borderRadius: "10px",
  boxShadow: "0 3px 10px rgba(0,0,0,0.1)"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "15px"
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "20px"
};

const totalBox = {
  textAlign: "right",
  marginTop: "15px"
};

const paymentBox = {
  marginTop: "15px",
  padding: "10px",
  background: "#f9f9f9",
  borderRadius: "8px"
};

const btn = {
  padding: "8px 12px",
  background: "#333",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer"
};

export default OrderDetails;