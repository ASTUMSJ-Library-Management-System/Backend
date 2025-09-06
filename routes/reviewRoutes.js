// routes/reviewRoutes.js
const express = require("express");
const Book = require("../models/Book");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();

function calcAvgRating(ratings = []) {
  if (!ratings.length) return 0;
  const avg =
    ratings.reduce((s, r) => s + Number(r.value || 0), 0) / ratings.length;
  return Number(avg.toFixed(1));
}

//
// ⭐ Get all reviews (ratings + comments) for a book
//    - requires auth so we can also return myRating consistently
//
router.get("/:bookId/reviews", authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId).populate(
      "comments.userId",
      "name"
    );
    if (!book)
      return res.status(404).json({ success: false, error: "Book not found" });

    const avgRating = calcAvgRating(book.ratings);
    const ratingsCount = book.ratings.length;
    const myRating =
      book.ratings.find((r) => r.userId.toString() === req.user.id)?.value || 0;

    res.json({
      success: true,
      ratings: book.ratings,
      comments: book.comments,
      avgRating,
      ratingsCount,
      myRating,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//
// ⭐ Add or update rating (must be logged in)
//
router.post("/:bookId/rating", authMiddleware, async (req, res) => {
  try {
    let { value } = req.body;
    value = Number(value);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      return res
        .status(400)
        .json({ success: false, error: "Rating must be 1–5." });
    }

    const book = await Book.findById(req.params.bookId);
    if (!book)
      return res.status(404).json({ success: false, error: "Book not found" });

    const existing = book.ratings.find(
      (r) => r.userId.toString() === req.user.id
    );
    if (existing) existing.value = value;
    else book.ratings.push({ userId: req.user.id, value });

    await book.save();

    const avgRating = calcAvgRating(book.ratings);
    const ratingsCount = book.ratings.length;
    const myRating = value;

    res.json({
      success: true,
      ratings: book.ratings,
      avgRating,
      ratingsCount,
      myRating,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//
// ❌ Remove my rating (must be logged in)
//
router.delete("/:bookId/rating", authMiddleware, async (req, res) => {
  try {
    const { bookId } = req.params;
    const book = await Book.findById(bookId);
    if (!book)
      return res.status(404).json({ success: false, error: "Book not found" });

    const before = book.ratings.length;
    book.ratings = book.ratings.filter(
      (r) => r.userId.toString() !== req.user.id
    );
    if (book.ratings.length === before) {
      // no rating to remove is not an error; we just return current state
    }

    await book.save();

    const avgRating = calcAvgRating(book.ratings);
    const ratingsCount = book.ratings.length;
    const myRating = 0;

    res.json({
      success: true,
      ratings: book.ratings,
      avgRating,
      ratingsCount,
      myRating,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//
// 💬 Add comment (must be logged in)
//
router.post("/:bookId/comment", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Comment text required." });
    }

    const book = await Book.findById(req.params.bookId);
    if (!book)
      return res.status(404).json({ success: false, error: "Book not found" });

    book.comments.push({ userId: req.user.id, text: text.trim() });
    await book.save();
    await book.populate("comments.userId", "name");

    res.json({ success: true, comments: book.comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//
// ✏️ Edit comment (must be logged in & owner)
//
router.put("/:bookId/comment/:commentId", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Comment text required." });
    }

    const book = await Book.findById(req.params.bookId);
    if (!book)
      return res.status(404).json({ success: false, error: "Book not found" });

    const comment = book.comments.id(req.params.commentId);
    if (!comment)
      return res
        .status(404)
        .json({ success: false, error: "Comment not found" });

    if (comment.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to edit this comment" });
    }

    comment.text = text.trim();
    comment.updatedAt = new Date();
    await book.save();
    await book.populate("comments.userId", "name");

    res.json({ success: true, comments: book.comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//
// 🗑 Delete comment (must be logged in & owner)
//
router.delete(
  "/:bookId/comment/:commentId",
  authMiddleware,
  async (req, res) => {
    try {
      const book = await Book.findById(req.params.bookId);
      if (!book)
        return res
          .status(404)
          .json({ success: false, error: "Book not found" });

      const comment = book.comments.id(req.params.commentId);
      if (!comment)
        return res
          .status(404)
          .json({ success: false, error: "Comment not found" });

      if (comment.userId.toString() !== req.user.id) {
        return res
          .status(403)
          .json({
            success: false,
            error: "Not authorized to delete this comment",
          });
      }

      comment.deleteOne();
      await book.save();
      await book.populate("comments.userId", "name");

      res.json({ success: true, comments: book.comments });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
