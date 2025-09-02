const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoute");

dotenv.config();
const app = express();

// Connect DB
connectDB();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"], // Allow frontend origins
    credentials: true,
  })
);
app.use(express.json()); // to read JSON body
app.use(cookieParser()); // to read cookies

// Routes
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/auth", authRoutes);

const bookRoutes = require("./routes/bookRoute");
app.use("/api/books", bookRoutes);
const borrowRoutes = require("./routes/borrowRoute");
// Mount borrow routes under /api/borrow
app.use("/api/borrow", borrowRoutes);
///
const paymentRoutes = require("./routes/paymentRoute");
app.use("/api/payments", paymentRoutes);

// General routes (stats, users, member summary)
const generalRoutes = require("./routes/generalRoute");
app.use("/api", generalRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
