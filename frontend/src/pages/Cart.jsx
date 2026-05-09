import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import "../styles/cart.css";

const Cart = () => {
  const [cart, setCart] = useState([]);

  // ================= FETCH CART =================
  const fetchCart = async () => {
    try {
      const customerId = localStorage.getItem("userId");
      if (!customerId) return;

      const res = await fetch(
        `http://localhost:5000/api/cart/${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      const data = await res.json();

      const formatted = data.map((item) => ({
        id: item.ID,
        item_id: item.ITEM_ID,
        item_name: item.ITEM_NAME,
        price: item.PRICE,
        quantity: item.QUANTITY,
        image: item.image || item.IMAGE
      }));

      setCart(formatted);

      // 🔥 update topbar cart count
      window.dispatchEvent(new Event("cartUpdated"));

    } catch (err) {
      console.error("Cart fetch error:", err);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // ================= UPDATE QTY =================
  const increaseQty = async (id) => {
    await fetch(`http://localhost:5000/api/cart/increase/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    fetchCart();
  };

  const decreaseQty = async (id) => {
    await fetch(`http://localhost:5000/api/cart/decrease/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    fetchCart();
  };

  // ================= REMOVE ITEM =================
  const removeItem = async (id) => {
    await fetch(`http://localhost:5000/api/cart/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    fetchCart();
  };

  // ================= CHECKOUT =================
  const checkout = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          customer_name: "Customer",
          branch: "pune"
        })
      });

      const data = await res.json();

      alert(data.message);

      // 🔥 refresh UI
      setCart([]);

      // 🔥 update topbar
      window.dispatchEvent(new Event("cartUpdated"));

    } catch (err) {
      console.error("Checkout error:", err);
      alert("Checkout failed ❌");
    }
  };

  // ================= TOTAL =================
  const subtotal = cart.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );

  const serviceFee = cart.length > 0 ? 0: 0;
  const total = subtotal + serviceFee;

  return (
    <Layout>
      <div className="cart-page">

        {/* LEFT */}
        <div className="cart-card-box">
          <h2>My Cart ({cart.length})</h2>

          {cart.length === 0 ? (
            <p className="empty">Cart is empty</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="cart-item">

                <img
                  src={item.image || "https://via.placeholder.com/80"}
                  alt="item"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/80";
                  }}
                />

                <div className="info">
                  <h4>{item.item_name}</h4>
                  <p>₹ {item.price}</p>

                  <div className="qty">
                    <button
                      className="dark-btn"
                      onClick={() => decreaseQty(item.id)}
                    >
                      -
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      className="dark-btn"
                      onClick={() => increaseQty(item.id)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  className="remove"
                  onClick={() => removeItem(item.id)}
                >
                  🗑
                </button>

              </div>
            ))
          )}
        </div>

        {/* RIGHT */}
        <div className="summary-card">
          <h2>Order Summary</h2>

          <div className="row">
            <span>Subtotal</span>
            <span>₹ {subtotal}</span>
          </div>

          <div className="row">
            <span>Service Fee</span>
            <span>₹ {serviceFee}</span>
          </div>

          <hr />

          <div className="row total">
            <span>Total</span>
            <span>₹ {total}</span>
          </div>

          <button
            className="checkout-btn"
            onClick={checkout}
            disabled={cart.length === 0}
          >
            Checkout
          </button>
        </div>

      </div>
    </Layout>
  );
};

export default Cart;