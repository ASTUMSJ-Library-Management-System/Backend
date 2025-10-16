
const dotenv = require("dotenv");
// Load environment variables from .env file at the very start
dotenv.config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoute");
const { ensureAdminUserExists } = require("./seed");

// Optional: Verify that the Gmail environment variables are loaded
console.log("GMAIL_USER:", process.env.GMAIL_USER ? "Loaded" : "MISSING");
console.log("GMAIL_APP_PASSWORD:", process.env.GMAIL_APP_PASSWORD ? "Loaded" : "MISSING");

const app = express();

// Connect DB
connectDB().then(() => {
  // After DB connection is successful, ensure the admin user exists.
  // This is a good place for any initial data seeding.
  ensureAdminUserExists().catch((err) => {
    console.error("Failed to run data seeder:", err);
  });
});

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"], // Allow frontend origins
    credentials: true,
  })
);
app.use(express.json()); // to read JSON body
app.use(cookieParser()); // to read cookies

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Review routes
const reviewRoutes = require("./routes/reviewRoute");
app.use("/api/reviews", reviewRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
