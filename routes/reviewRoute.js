const express = require("express");
const router = express.Router();
const {
  createOrUpdateReview,
  getBookReviews,
  getUserReview,
  updateReview,
  deleteReview,
  getUserReviews,
  getBookReviewStats,
} = require("../controllers/reviewController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/", createOrUpdateReview);

router.get("/book/:bookId", getBookReviews);

router.get("/book/:bookId/user", getUserReview);

router.get("/user", getUserReviews);

router.get("/book/:bookId/stats", getBookReviewStats);

router.put("/:reviewId", updateReview);

router.delete("/:reviewId", deleteReview);

module.exports = router;
