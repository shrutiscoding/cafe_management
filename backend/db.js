const oracledb = require("oracledb");

// 🔹 DB Configuration (change according to your Oracle setup)
const dbConfig = {
  user: "cafe_user",          // your Oracle username
  password: "cafe123",  // your Oracle password
  connectString: "localhost/XEPDB1" // or "localhost:1521/XE"
};

// 🔹 Function to get connection
async function connectDB() {
  try {
    const connection = await oracledb.getConnection(dbConfig);
    console.log("✅ Connected to Oracle Database");
    return connection;
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
  }
}

module.exports = connectDB;