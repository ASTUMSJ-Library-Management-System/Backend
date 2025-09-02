const express = require("express");
const router = express.Router();

// Controllers
const {
  addBook,
  updateBook,
  deleteBook,
  getBooks,
} = require("../controllers/bookController");

// Middlewares
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

const { upload } = require("../config/cloudinary");

//  BOOK ROUTES
// Admin routes
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  addBook
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  updateBook
);
router.delete("/:id", authMiddleware, adminMiddleware, deleteBook);

// User route (any logged-in user)
router.get("/", authMiddleware, getBooks);

module.exports = router;
