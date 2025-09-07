const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Ensure one review per user per book
reviewSchema.index({ userId: 1, bookId: 1 }, { unique: true });

// Virtual for average rating calculation
reviewSchema.virtual("book", {
  ref: "Book",
  localField: "bookId",
  foreignField: "_id",
  justOne: true,
});

reviewSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Update editedAt when comment is modified
reviewSchema.pre("save", function (next) {
  if (this.isModified("comment") && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Review", reviewSchema);
