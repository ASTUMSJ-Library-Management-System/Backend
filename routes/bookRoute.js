const express = require("express");
const router = express.Router();

const {
  addBook,
  updateBook,
  deleteBook,
  getBooks,
} = require("../controllers/bookController");

const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

const { uploadBookImage } = require("../config/cloudinary");

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  uploadBookImage.single("image"),
  addBook
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  uploadBookImage.single("image"),
  updateBook
);
router.delete("/:id", authMiddleware, adminMiddleware, deleteBook);

router.get("/", authMiddleware, getBooks);

module.exports = router;
