// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoute");
const bookRoutes = require("./routes/bookRoute");
const borrowRoutes = require("./routes/borrowRoute");
const paymentRoutes = require("./routes/paymentRoute");
const generalRoutes = require("./routes/generalRoute");
const reviewRoutes = require("./routes/reviewRoutes");


dotenv.config();
const app = express();

// Connect DB
connectDB();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/borrow", borrowRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", generalRoutes);

// ⭐ Mount reviews here (NOTE the path)
app.use("/api/reviews", reviewRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
