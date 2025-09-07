const Review = require("../models/Review");
const Book = require("../models/Book");
const User = require("../models/User");

// Create or update a review
exports.createOrUpdateReview = async (req, res) => {
  try {
    const { bookId, rating, comment } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!bookId || !rating || !comment) {
      return res.status(400).json({
        message: "Book ID, rating, and comment are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has borrowed this book (optional validation)
    // You can add this validation if you want to restrict reviews to only users who borrowed the book

    // Create or update review
    const review = await Review.findOneAndUpdate(
      { userId, bookId },
      { rating, comment, isEdited: true, editedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    ).populate("user", "name studentId");

    // Update book's average rating
    await updateBookAverageRating(bookId);

    res.status(201).json({
      message: "Review saved successfully",
      review,
    });
  } catch (error) {
    console.error("Error in createOrUpdateReview:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all reviews for a specific book
exports.getBookReviews = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    // Validate book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get reviews with pagination
    const reviews = await Review.find({ bookId })
      .populate("user", "name studentId")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalReviews = await Review.countDocuments({ bookId });

    // Calculate average rating
    const avgRatingResult = await Review.aggregate([
      { $match: { bookId: new mongoose.Types.ObjectId(bookId) } },
      { $group: { _id: null, averageRating: { $avg: "$rating" } } },
    ]);

    const averageRating = avgRatingResult.length > 0 ? avgRatingResult[0].averageRating : 0;

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / parseInt(limit)),
        totalReviews,
        hasNext: skip + reviews.length < totalReviews,
        hasPrev: parseInt(page) > 1,
      },
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
    });
  } catch (error) {
    console.error("Error in getBookReviews:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's review for a specific book
exports.getUserReview = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;

    const review = await Review.findOne({ userId, bookId }).populate(
      "user",
      "name studentId"
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json(review);
  } catch (error) {
    console.error("Error in getUserReview:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update user's review
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Validate input
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    // Find review and check ownership
    const review = await Review.findOne({ _id: reviewId, userId });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Update review
    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;
    updateData.isEdited = true;
    updateData.editedAt = new Date();

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      updateData,
      { new: true, runValidators: true }
    ).populate("user", "name studentId");

    // Update book's average rating
    await updateBookAverageRating(review.bookId);

    res.json({
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error in updateReview:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete user's review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Find review and check ownership
    const review = await Review.findOne({ _id: reviewId, userId });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const bookId = review.bookId;

    // Delete review
    await Review.findByIdAndDelete(reviewId);

    // Update book's average rating
    await updateBookAverageRating(bookId);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error in deleteReview:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all reviews by a user
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user's reviews with book details
    const reviews = await Review.find({ userId })
      .populate("bookId", "title author image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalReviews = await Review.countDocuments({ userId });

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / parseInt(limit)),
        totalReviews,
        hasNext: skip + reviews.length < totalReviews,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error in getUserReviews:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get book statistics (average rating, total reviews)
exports.getBookReviewStats = async (req, res) => {
  try {
    const { bookId } = req.params;

    // Validate book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Get review statistics
    const stats = await Review.aggregate([
      { $match: { bookId: new mongoose.Types.ObjectId(bookId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: {
              rating: "$rating",
            },
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return res.json({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    }

    const result = stats[0];
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // Count rating distribution
    result.ratingDistribution.forEach((item) => {
      ratingDistribution[item.rating]++;
    });

    res.json({
      averageRating: Math.round(result.averageRating * 10) / 10,
      totalReviews: result.totalReviews,
      ratingDistribution,
    });
  } catch (error) {
    console.error("Error in getBookReviewStats:", error);
    res.status(500).json({ message: error.message });
  }
};

// Helper function to update book's average rating
async function updateBookAverageRating(bookId) {
  try {
    const avgRatingResult = await Review.aggregate([
      { $match: { bookId: new mongoose.Types.ObjectId(bookId) } },
      { $group: { _id: null, averageRating: { $avg: "$rating" } } },
    ]);

    const averageRating = avgRatingResult.length > 0 ? avgRatingResult[0].averageRating : 0;

    // Update book with average rating (you might want to add this field to Book model)
    await Book.findByIdAndUpdate(bookId, {
      averageRating: Math.round(averageRating * 10) / 10,
    });
  } catch (error) {
    console.error("Error updating book average rating:", error);
  }
}

// Import mongoose for ObjectId
const mongoose = require("mongoose");
