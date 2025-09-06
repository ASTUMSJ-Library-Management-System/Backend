const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, trim: true, maxlength: 1000, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { _id: true }
);
const ratingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    value: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    ISBN: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    publicationYear: { type: Number, required: true },
    language: { type: String },
    description: { type: String },
    image: { type: String },
    totalCopies: { type: Number, required: true },
    availableCopies: {
      type: Number,
      default: function () {
        return this.totalCopies;
      },
    },
    ratings: [ratingSchema],
    comments: [commentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
