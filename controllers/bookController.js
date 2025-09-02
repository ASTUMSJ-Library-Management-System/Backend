const Book = require("../models/Book");
const Payment = require("../models/Payment");
const Borrow = require("../models/Borrow");
// Add new book (Admin only)
exports.addBook = async (req, res) => {
  try {
    console.log(" Adding new book:", req.body);

    const {
      title,
      author,
      ISBN,
      category,
      publicationYear,
      language,
      description,
      totalCopies,
    } = req.body;

    const payload = {
      title,
      author,
      ISBN,
      category,
      publicationYear: parseInt(publicationYear, 10),
      language,
      description,
      totalCopies: parseInt(totalCopies, 10),
    };

    if (req.file && req.file.path) {
      payload.image = req.file.path; // Cloudinary URL
    }

    const book = new Book(payload);
    await book.save();
    console.log(" Book added successfully:", book);
    res.status(201).json(book);
  } catch (err) {
    console.error(" Error in addBook:", err);
    res.status(400).json({ message: err.message });
  }
};

// Update book (Admin only)
exports.updateBook = async (req, res) => {
  try {
    console.log(" Updating book with ID:", req.params.id);

    const updateData = { ...req.body };
    if (updateData.publicationYear)
      updateData.publicationYear = parseInt(updateData.publicationYear, 10);
    if (updateData.totalCopies)
      updateData.totalCopies = parseInt(updateData.totalCopies, 10);

    if (req.file && req.file.path) {
      updateData.image = req.file.path;
    }

    const book = await Book.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!book) {
      console.warn(" Book not found:", req.params.id);
      return res.status(404).json({ message: "Book not found" });
    }
    console.log(" Book updated successfully:", book);
    res.json(book);
  } catch (err) {
    console.error(" Error in updateBook:", err);
    res.status(400).json({ message: err.message });
  }
};

// Delete book (Admin only, only if not borrowed)
exports.deleteBook = async (req, res) => {
  try {
    console.log(" Deleting book with ID:", req.params.id);
    const book = await Book.findById(req.params.id);
    if (!book) {
      console.warn(" Book not found:", req.params.id);
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.availableCopies !== book.totalCopies) {
      console.warn(" Book is currently borrowed, cannot delete:", book._id);
      return res
        .status(400)
        .json({ message: "Book is currently borrowed and cannot be deleted" });
    }

    await book.deleteOne();
    console.log(" Book deleted successfully:", book._id);
    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    console.error(" Error in deleteBook:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get all books (all logged in users)
exports.getBooks = async (req, res) => {
  try {
    console.log(" Fetching all books...");
    const books = await Book.find();
    console.log(" Books fetched:", books.length, "books");
    res.json(books);
  } catch (err) {
    console.error(" Error in getBooks:", err);
    res.status(500).json({ message: err.message });
  }
};
exports.borrowBook = async (req, res) => {
  try {
    const bookId = req.params.bookId;

    // 1. Check if student has approved payment this month
    const approvedPayment = await Payment.findOne({
      userId: req.user._id,
      status: "Approved",
      createdAt: { $gte: new Date(new Date().setDate(1)) }, // this month
    });

    if (!approvedPayment) {
      return res.status(403).json({
        message: "You must have an approved monthly membership to borrow books",
      });
    }

    // 2. Check active borrowed books count
    const activeBorrows = await Borrow.countDocuments({
      userId: req.user._id,
      returned: false,
    });
    if (activeBorrows >= 3) {
      return res
        .status(403)
        .json({ message: "You can only borrow 3 books at a time" });
    }

    // 3. Proceed with borrowing
    const borrow = await Borrow.create({
      userId: req.user._id,
      bookId,
      returned: false,
    });
    await Book.findByIdAndUpdate(bookId, { $inc: { copies: -1 } });

    res.json(borrow);
  } catch (error) {
    res.status(500).json({ message: "Error borrowing book", error });
  }
};
