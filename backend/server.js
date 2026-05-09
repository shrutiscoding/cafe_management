const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const connectDB = require("./db");
const connectMongo = require("./mongoDB");
const { ObjectId } = require("mongodb");
let mongoDB;

// Connect Mongo once
connectMongo().then((db) => {
  mongoDB = db;
});

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = "mysecretkey";


// ==========================
// ✅ REGISTER API
// ==========================
app.post("/api/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const connection = await connectDB();

    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.execute(
      `INSERT INTO customers (id, name, email, password_hash, role)
       VALUES (SYS_GUID(), :name, :email, :password, :role)`,
      {
        name,
        email,
        password: hashedPassword,
        role: role || "customer"
      },
      { autoCommit: true }
    );

    res.json({ message: "User registered successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});


// ==========================
// ✅ LOGIN API
// ==========================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const connection = await connectDB();

    const result = await connection.execute(
      `SELECT id, email, password_hash, role 
       FROM customers WHERE email = :email`,
      { email }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }
    
    const user = result.rows[0];
    const dbPassword = user[2];
    
    const isMatch = await bcrypt.compare(password, dbPassword);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user[0], role: user[3] },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      role: user[3],
      userId: user[0] 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});


// ==========================
// 🔐 VERIFY TOKEN
// ==========================
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) return res.status(403).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};


// ==========================
// 🎯 ROLE CHECK (UPDATED)
// ==========================
// supports single OR multiple roles
const checkRole = (roles) => (req, res, next) => {
  if (!Array.isArray(roles)) {
    roles = [roles]; 
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  next();
};


// ==========================
// 🔒 PROTECTED ROUTES
// ==========================

// Admin only
app.get("/api/admin", verifyToken, checkRole("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

// Any logged-in user
app.get("/api/user", verifyToken, (req, res) => {
  res.json({ message: "Welcome User" });
});


// ==========================
// 📦 INVENTORY
// ==========================

// GET inventory (Admin + Employee)
app.get("/api/inventory", verifyToken, checkRole(["admin", "employee"]), async (req, res) => {
  try {
    const connection = await connectDB();

    const result = await connection.execute(
      "SELECT id, name, quantity, unit, reorder_level FROM inventory",
      [],
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT } // 🔥 IMPORTANT
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching inventory" });
  }
});

// ADD inventory (Admin only)
app.post("/api/inventory", verifyToken, checkRole("admin"), async (req, res) => {
  const { name, quantity, unit, reorder_level } = req.body;

  try {
    const connection = await connectDB();

    await connection.execute(
      `INSERT INTO inventory (id, name, quantity, unit, reorder_level)
       VALUES (SYS_GUID(), :name, :quantity, :unit, :reorder_level)`,
      {
        name,
        quantity,
        unit,
        reorder_level,
      },
      { autoCommit: true }
    );

    res.json({ message: "Added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Insert error" });
  }
});

// DELETE inventory (Admin only)
app.delete("/api/inventory/:id", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const connection = await connectDB();

    await connection.execute(
      "DELETE FROM inventory WHERE id = :id",
      { id: req.params.id },
      { autoCommit: true }
    );

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting inventory" });
  }
});

// UPDATE inventory
app.put("/api/inventory/:id", verifyToken, checkRole("admin"), async (req, res) => {
  const { name, quantity, unit, reorder_level } = req.body;

  try {
    const connection = await connectDB();

    await connection.execute(
      `UPDATE inventory
       SET name=:name, quantity=:quantity, unit=:unit, reorder_level=:reorder_level
       WHERE id=:id`,
      {
        id: req.params.id,
        name,
        quantity,
        unit,
        reorder_level,
      },
      { autoCommit: true }
    );

    res.json({ message: "Updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update error" });
  }
});
// ==========================
// 👨‍💼 EMPLOYEES
// ==========================

// GET employees (Admin only)
app.get("/api/employees", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const connection = await connectDB();

    const result = await connection.execute(
      "SELECT id, name, role, salary,branch, hire_date FROM employees",
      [],
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }// ✅ works now
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching employees" });
  }
});


// ADD employee (Admin only)
const { v4: uuidv4 } = require("uuid");

app.post("/api/employees", verifyToken, checkRole("admin"), async (req, res) => {
  const { name, email, password, role, salary, hire_date, branch } = req.body;

  try {
    const connection = await connectDB();

    const hashedPassword = await bcrypt.hash(password, 10);

    const id = uuidv4(); // ✅ SAME ID FOR BOTH TABLES

    // 1️⃣ EMPLOYEES
    await connection.execute(
      `INSERT INTO employees (id, name, role, salary, hire_date, branch)
       VALUES (:id, :name, :role, :salary, TO_DATE(:hire_date, 'YYYY-MM-DD'), :branch)`,

      {
        id,
        name,
        role,
        salary,
        hire_date,
        branch,
      },
      { autoCommit: false }
    );

    // 2️⃣ CUSTOMERS (LOGIN)
    await connection.execute(
      `INSERT INTO customers (id, name, email, password_hash, role)
       VALUES (:id, :name, :email, :password, :role)`,

      {
        id,
        name,
        email,
        password: hashedPassword,
        role: "employee",
      },
      { autoCommit: true }
    );

    res.json({ message: "Employee + Login created" });

  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    res.status(500).json({ message: "Error adding employee" });
  }
});

app.delete("/api/employees/:id", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const connection = await connectDB();

    // delete from employees
    await connection.execute(
      "DELETE FROM employees WHERE id = :id",
      { id: req.params.id },
      { autoCommit: false }
    );

    // delete from customers (login table)
    await connection.execute(
      "DELETE FROM customers WHERE id = :id",
      { id: req.params.id },
      { autoCommit: true }
    );

    res.json({ message: "Deleted from both tables" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});


// ==========================
// 👥 CUSTOMERS (Admin only)
// ==========================
app.get("/api/customers", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const connection = await connectDB();
    const result = await connection.execute("SELECT id,email,name,created_at  FROM customers where role='customer'",
      [],
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }// ✅ works now
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching customers" });
  }
});

app.delete("/api/customers/:id", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const connection = await connectDB();

    await connection.execute(
      "DELETE FROM customers WHERE id = :id",
      { id: req.params.id },
      { autoCommit: true }
    );

    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});



// ==========================
// 📌 GET MENU ITEMS
// ==========================
app.get("/api/menu", async (req, res) => {
  try {
    const menu = await mongoDB.collection("menu").find().toArray();
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// 📌 COUNT AVAILABLE ITEMS
// ==========================
app.get("/api/menu-count", async (req, res) => {
  try {
    const db = await connectMongo();

    const count = await db.collection("menu").countDocuments({
      availability: true,
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/menu", verifyToken, checkRole(["admin", "employee"]), async (req, res) => {
  try {
    const { name, price, category, image, availability } = req.body;

    const result = await mongoDB.collection("menu").insertOne({
      name,
      price,
      category,
      image,
      availability: availability ?? true
    });

    res.json({
      message: "Menu item added",
      id: result.insertedId
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/menu/:id", verifyToken, checkRole(["admin", "employee"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;

    await mongoDB.collection("menu").updateOne(
      { _id: new ObjectId(id) },   // ✅ FIX
      { $set: { availability } }
    );

    res.json({ message: "Updated availability" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/menu/:id", verifyToken, checkRole(["admin", "employee"]), async (req, res) => {
  try {
    const { id } = req.params;

    await mongoDB.collection("menu").deleteOne({
      _id: new ObjectId(id)   // ✅ FIX
    });

    res.json({ message: "Menu item deleted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/menu/:id", verifyToken, checkRole(["admin", "employee"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, image } = req.body;

    await mongoDB.collection("menu").updateOne(
      { _id: new ObjectId(id) },   // ✅ FIX
      {
        $set: { name, price, category, image }
      }
    );

    res.json({ message: "Updated successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// 📊 DASHBOARD API (FINAL)
// ==========================
app.get(
  "/api/dashboard",
  verifyToken,
  checkRole(["admin", "employee"]),
  async (req, res) => {
    let connection;

    try {
      connection = await connectDB();

      // ================= MAIN STATS =================
      const result = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM orders) AS total_orders,
          (SELECT NVL(SUM(amount), 0) FROM payments where status='completed') AS total_revenue,
          (SELECT COUNT(*) FROM customers WHERE role='customer') AS total_customers,
          (SELECT COUNT(*) FROM inventory WHERE quantity <= reorder_level) AS low_stock
        FROM dual
      `);

      const row = result.rows[0];

      // ================= DAILY REVENUE =================
      const dailyRevenue = await connection.execute(`
  SELECT 
    TRUNC(created_at),
    SUM(amount)
  FROM payments
  WHERE status = 'completed'
  GROUP BY TRUNC(created_at)
  ORDER BY TRUNC(created_at)
`, [], { outFormat: require("oracledb").OUT_FORMAT_OBJECT });

      // ================= TOP ITEMS =================
      const topItems = await connection.execute(`
        SELECT 
          item_name,
          SUM(quantity) AS qty
        FROM order_items
        GROUP BY item_name
        ORDER BY qty DESC
        FETCH FIRST 5 ROWS ONLY
      `);

      // ================= RECENT ORDERS =================
      const recentOrders = await connection.execute(`
        SELECT id, total, status, created_at
        FROM orders
        ORDER BY created_at DESC
        FETCH FIRST 5 ROWS ONLY
      `);

      // ================= MENU COUNT =================
      const totalMenus = await mongoDB.collection("menu").countDocuments();

      res.json({
        totalOrders: row[0],
        revenue: row[1],
        customers: row[2],
        lowStock: row[3],

        totalMenus,

        dailyRevenue: dailyRevenue.rows,
        topItems: topItems.rows,
        recentOrders: recentOrders.rows,
      });

    } catch (err) {
      console.error("🔥 Dashboard error:", err);
      res.status(500).json({ message: "Dashboard fetch failed" });

    } finally {
      if (connection) await connection.close();
    }
  }
);


app.post("/api/cart", async (req, res) => {
  const { customer_id, item_id, item_name, price, quantity, image } = req.body;

  const connection = await connectDB();

  await connection.execute(
    `INSERT INTO cart 
    (id, customer_id, item_id, item_name, price, quantity, image)
    VALUES (SYS_GUID(), :customer_id, :item_id, :item_name, :price, :quantity, :image)`,

    { customer_id, item_id, item_name, price, quantity, image },
    { autoCommit: true }
  );

  res.json({ message: "Item added to cart" });
});

app.get("/api/cart/:customerId", async (req, res) => {
  try {
    const connection = await connectDB();

    const oracledb = require("oracledb");

    // 1️⃣ get cart items
    const result = await connection.execute(
      `SELECT * FROM cart WHERE customer_id = :id`,
      { id: req.params.customerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const cartItems = result.rows;

    // 2️⃣ enrich with MongoDB menu data
    const enrichedCart = await Promise.all(
      cartItems.map(async (item) => {
        const menuItem = await mongoDB.collection("menu").findOne({
          _id: item.ITEM_ID
        });

        return {
          ...item,
          image: menuItem?.image || null,
          price: menuItem?.price || item.PRICE
        };
      })
    );

    res.json(enrichedCart);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cart fetch failed" });
  }
});

app.delete("/api/cart/:id", async (req, res) => {
  try {
    const connection = await connectDB();

    await connection.execute(
      `DELETE FROM cart WHERE id = :id`,
      { id: req.params.id },
      { autoCommit: true }
    );

    res.json({ message: "Deleted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/cart/increase/:id", async (req, res) => {
  try {
    const connection = await connectDB();

    await connection.execute(
      `UPDATE cart 
       SET quantity = quantity + 1
       WHERE id = :id`,
      { id: req.params.id },
      { autoCommit: true }
    );

    res.json({ message: "Quantity increased" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Increase failed" });
  }
});


app.put("/api/cart/decrease/:id", async (req, res) => {
  try {
    const connection = await connectDB();

    // 1️⃣ decrease quantity
    await connection.execute(
      `UPDATE cart 
       SET quantity = quantity - 1
       WHERE id = :id`,
      { id: req.params.id },
      { autoCommit: true }
    );

    // 2️⃣ check if quantity is 0 or less
    const result = await connection.execute(
      `SELECT quantity FROM cart WHERE id = :id`,
      { id: req.params.id },
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    const qty = result.rows[0]?.QUANTITY;

    // 3️⃣ auto remove if 0
    if (qty <= 0) {
      await connection.execute(
        `DELETE FROM cart WHERE id = :id`,
        { id: req.params.id },
        { autoCommit: true }
      );
    }

    res.json({ message: "Quantity updated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Decrease failed" });
  }
});

app.get("/api/orders/customer/:id", verifyToken, async (req, res) => {
  const connection = await connectDB();

  const result = await connection.execute(
    `SELECT * FROM orders WHERE customer_id = :id`,
    { id: req.params.id },
    { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
  );

  res.json(result.rows);
});

// ==========================
// 📦 GET ORDERS WITH ITEMS
// ==========================
app.get("/api/orders", verifyToken, checkRole(["admin", "employee"]), async (req, res) => {
  const connection = await connectDB();
  const oracledb = require("oracledb");

  const orders = await connection.execute(
    `SELECT * FROM orders ORDER BY created_at DESC`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const result = [];

  for (let order of orders.rows) {
    const items = await connection.execute(
      `SELECT item_name, quantity FROM order_items WHERE order_id = :id`,
      { id: order.ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    result.push({
      ...order,
      items: items.rows
    });
  }

  res.json(result);
});

// ==========================
// 🧾 CREATE ORDER (CHECKOUT)
// ==========================
app.post("/api/orders", verifyToken, async (req, res) => {
  let connection;

  try {
    connection = await connectDB();

    const customerId = req.user.id;
    const { customer_name, branch } = req.body;

    // 1️⃣ Get cart items
    const cartResult = await connection.execute(
      `SELECT * FROM cart WHERE customer_id = :id`,
      { id: customerId },
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 2️⃣ Calculate total
    const total = cartItems.reduce(
      (sum, item) => sum + item.PRICE * item.QUANTITY,
      0
    );

    const orderId = uuidv4();

    // 3️⃣ Insert ORDER
    await connection.execute(
      `INSERT INTO orders 
       (id, customer_id, customer_name, total, branch, status)
       VALUES (:id, :customer_id, :customer_name, :total, :branch, 'new')`,
      {
        id: orderId,
        customer_id: customerId,
        customer_name: customer_name || "Customer",
        total,
        branch: branch || "main"
      }
    );

    // 4️⃣ Insert ORDER ITEMS
    for (const item of cartItems) {
      await connection.execute(
        `INSERT INTO order_items 
         (id, order_id, item_id, item_name, quantity, unit_price)
         VALUES (:id, :order_id, :item_id, :item_name, :quantity, :unit_price)`,
        {
          id: uuidv4(),
          order_id: orderId,
          item_id: item.ITEM_ID,
          item_name: item.ITEM_NAME,
          quantity: item.QUANTITY,
          unit_price: item.PRICE
        }
      );
    }

    // 5️⃣ Clear cart
    await connection.execute(
      `DELETE FROM cart WHERE customer_id = :id`,
      { id: customerId }
    );

    await connection.commit();

    res.json({ message: "Order placed successfully ✅" });

  } catch (err) {
    console.error("Order error:", err);

    if (connection) await connection.rollback();

    res.status(500).json({ message: "Order failed ❌" });

  } finally {
    if (connection) await connection.close();
  }
});

// ==========================
// 🔄 UPDATE ORDER STATUS
// ==========================
const oracledb = require("oracledb");
app.put("/api/orders/status/:id", verifyToken, checkRole(["admin", "employee"]), async (req, res) => {
  let connection;

  try {
    const { status } = req.body;
    const orderId = req.params.id;

    connection = await connectDB();

    // 1️⃣ UPDATE ORDER STATUS
    await connection.execute(
      `UPDATE orders SET status = :status WHERE id = :id`,
      { status, id: orderId },
      { autoCommit: false }
    );

    // ==========================
    // 🟡 WHEN STATUS = READY
    // ==========================
    if (status === "ready") {

      // 2️⃣ GET ORDER ITEMS
      const itemsResult = await connection.execute(
        `SELECT item_name, quantity FROM order_items WHERE order_id = :id`,
        { id: orderId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const items = itemsResult.rows;

      let requiredIngredients = {};

      // ==========================
      // 3️⃣ COLLECT INGREDIENTS
      // ==========================
      for (let item of items) {

        const menuItem = await mongoDB.collection("menu").findOne({
          name: { $regex: new RegExp(`^${item.ITEM_NAME}$`, "i") }
        });

        if (!menuItem) {
          throw new Error(`Menu item not found: ${item.ITEM_NAME}`);
        }

        if (!menuItem.ingredients || menuItem.ingredients.length === 0) {
          throw new Error(`No ingredients for ${item.ITEM_NAME}`);
        }

        for (let ing of menuItem.ingredients) {

          const ingName = ing.name.trim().toLowerCase();
          const qtyNeeded = (ing.qty || 0) * item.QUANTITY;

          requiredIngredients[ingName] =
            (requiredIngredients[ingName] || 0) + qtyNeeded;
        }
      }

      console.log("✅ TOTAL INGREDIENTS:", requiredIngredients);

      // ==========================
      // 4️⃣ VALIDATE STOCK
      // ==========================
      for (let ingName in requiredIngredients) {

        const stock = await connection.execute(
          `SELECT quantity FROM inventory 
           WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name))`,
          { name: ingName },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log("Checking:", ingName, stock.rows);

        if (!stock.rows || stock.rows.length === 0) {
          throw new Error(`Ingredient not found: ${ingName}`);
        }

        const available = stock.rows[0].QUANTITY;

        if (available < requiredIngredients[ingName]) {
          throw new Error(`Not enough ${ingName}`);
        }
      }

      // ==========================
      // 5️⃣ UPDATE INVENTORY
      // ==========================
      for (let ingName in requiredIngredients) {

        const result = await connection.execute(
          `UPDATE inventory
           SET quantity = quantity - :qty
           WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name))`,
          {
            qty: requiredIngredients[ingName],
            name: ingName
          }
        );

        if (result.rowsAffected === 0) {
          throw new Error(`Update failed for ${ingName}`);
        }
      }

      console.log("✅ Inventory updated successfully");

      // ==========================
      // 6️⃣ CREATE PAYMENT
      // ==========================
      const orderRes = await connection.execute(
        `SELECT total FROM orders WHERE id = :id`,
        { id: orderId }
      );

      const totalAmount = orderRes.rows[0][0];

      const existing = await connection.execute(
        `SELECT id FROM payments WHERE order_id = :id`,
        { id: orderId }
      );

      if (existing.rows.length === 0) {
        await connection.execute(
          `INSERT INTO payments (id, order_id, amount, method, status)
           VALUES (:id, :order_id, :amount, :method, :status)`,
          {
            id: uuidv4(),
            order_id: orderId,
            amount: totalAmount,
            method: "cash",
            status: "pending"
          }
        );

        console.log("✅ Payment created");
      }
    }
    // ==========================
    // ✅ COMMIT
    // ==========================
    await connection.commit();

    res.json({ message: "Order updated successfully ✅" });

  } catch (err) {
    console.error("🔥 ERROR:", err.message);

    if (connection) await connection.rollback();

    res.status(500).json({ message: err.message });

  } finally {
    if (connection) await connection.close();
  }
});

app.get("/api/orders/full", verifyToken, async (req, res) => {
  const connection = await connectDB();

  const orders = await connection.execute(
    `SELECT * FROM orders`,
    [],
    { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
  );

  for (let order of orders.rows) {
    const items = await connection.execute(
      `SELECT * FROM order_items WHERE order_id = :id`,
      { id: order.ID },
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    order.items = items.rows;
  }

  res.json(orders.rows);
});


app.get("/api/payments", verifyToken, checkRole(["admin", "employee"]), async (req, res) => {
  const connection = await connectDB();

  const result = await connection.execute(
    `SELECT * FROM payments ORDER BY id DESC`,
    [],
    { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
  );

  res.json(result.rows);
});

app.put("/api/payments/:id", verifyToken, checkRole(["admin", "employee"]), async (req, res) => {
  let connection;

  try {
    const { id } = req.params;
    const { method, status } = req.body;

    connection = await connectDB();

    const result = await connection.execute(
      `
      UPDATE payments
      SET method = :method,
          status = :status
      WHERE id = :id
      `,
      {
        id,
        method,
        status
      },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json({ message: "Payment updated successfully" });

  } catch (err) {
    console.error("Payment update error:", err);
    res.status(500).json({ message: "Update failed" });

  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/customer/profile
app.get("/api/customer/profile", verifyToken, async (req, res) => {
  try {
    const db = await connectDB();

    const result = await db.execute(
      `SELECT id, name, email, phone, role 
       FROM customers 
       WHERE id = :id`,
      { id: req.user.id }
    );

    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Convert array → object
    const user = {
      id: row[0],
      name: row[1],
      email: row[2],
      phone: row[3],
      role: row[4],
    };

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/customer/profile", verifyToken, async (req, res) => {
  try {
    const db = await connectDB();
    const { name, phone } = req.body;

    await db.execute(
      `UPDATE customers 
       SET name = :name, phone = :phone 
       WHERE id = :id`,
      {
        name,
        phone,
        id: req.user.id,
      },
      { autoCommit: true }
    );

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/orders/details/:orderId", verifyToken, async (req, res) => {
  let connection;

  try {
    connection = await connectDB();
    const orderId = req.params.orderId;

    // ================= ORDER + CUSTOMER =================
    const orderResult = await connection.execute(
      `SELECT 
          o.id,
          o.total,
          o.status,
          o.created_at,
          c.name AS customer_name,
          c.email AS customer_email
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = :id`,
      { id: orderId },
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    // ================= ORDER ITEMS (FIXED ✅) =================
    const itemsResult = await connection.execute(
      `SELECT 
          item_name,
          quantity,
          unit_price
       FROM order_items
       WHERE order_id = :id`,
      { id: orderId },
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    // ================= PAYMENT =================
    const paymentResult = await connection.execute(
      `SELECT 
          amount,
          method,
          status
       FROM payments
       WHERE order_id = :id`,
      { id: orderId },
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows,
      payment: paymentResult.rows[0] || null
    });

  } catch (err) {
    console.error("Order details error:", err);
    res.status(500).json({ message: "Order details fetch failed" });
  } finally {
    if (connection) await connection.close();
  }
});

app.get("/api/orders/my", verifyToken, async (req, res) => {
  let connection;

  try {
    connection = await connectDB();

    const result = await connection.execute(
      `SELECT 
          o.id,
          o.total,
          o.status,
          o.created_at
       FROM orders o
       WHERE o.customer_id = :id
       ORDER BY o.created_at DESC`,
      { id: req.user.id },
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  } finally {
    if (connection) await connection.close();
  }
});
// ==========================
app.listen(5000, () => {
  console.log("✅ Server running on http://localhost:5000");
});