const mongoose = require("mongoose");

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
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
