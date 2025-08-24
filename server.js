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

// Error handling (optional)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
