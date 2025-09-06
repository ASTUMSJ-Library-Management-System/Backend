const Borrow = require("../models/Borrow");
const Book = require("../models/Book");
const Payment = require("../models/Payment"); // Make sure you have Payment model

// Borrow a book
exports.borrowBook = async (req, res) => {
  try {
    const userId = req.user.id; // from authMiddleware
    const bookId = req.params.bookId;

    // Check if user is student
    if (req.user.role !== "student")
      return res
        .status(403)
        .json({ message: "Only students can borrow books" });

    // Check payment status
    const approvedPayment = await Payment.findOne({
      userId,
      status: "Approved",
    });
    if (!approvedPayment) {
      return res
        .status(403)
        .json({ message: "Membership payment required or not approved yet" });
    }

    // Check active borrow count
    const activeBorrows = await Borrow.countDocuments({
      userId,
      status: "Active",
    });
    if (activeBorrows >= 3)
      return res
        .status(400)
        .json({ message: "Cannot borrow more than 3 active books" });

    // Check book availability
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.availableCopies <= 0)
      return res.status(400).json({ message: "No available copies" });

    // Decrease available copies
    book.availableCopies -= 1;
    await book.save();

    // Set due date (e.g., 14 days from borrowDate)
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(borrowDate.getDate() + 14);

    const borrow = new Borrow({
      userId,
      bookId,
      borrowDate,
      dueDate,
      status: "Active",
    });
    await borrow.save();

    res.status(201).json(borrow);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Student: Request to return a book (marks as Pending). Admin must approve to finalize.
exports.requestReturn = async (req, res) => {
  try {
    const userId = req.user.id;
    const borrowId = req.params.borrowId;

    const borrow = await Borrow.findById(borrowId);
    if (!borrow)
      return res.status(404).json({ message: "Borrow record not found" });
    if (borrow.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Not allowed to request return for this book" });
    }
    if (borrow.status === "Returned") {
      return res
        .status(400)
        .json({ message: "This borrow is already returned" });
    }
    if (borrow.status === "Pending") {
      return res
        .status(400)
        .json({ message: "Return already requested and pending approval" });
    }

    borrow.status = "Pending";
    await borrow.save();

    res.json({
      message: "Return request submitted and pending admin approval",
      borrow,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Approve return. Sets status to Returned/Overdue and increments copies.
exports.approveReturn = async (req, res) => {
  try {
    const borrowId = req.params.borrowId;

    const borrow = await Borrow.findById(borrowId);
    if (!borrow)
      return res.status(404).json({ message: "Borrow record not found" });
    if (borrow.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "Borrow is not pending return approval" });
    }

    const today = new Date();
    borrow.status = today > borrow.dueDate ? "Overdue" : "Returned";
    await borrow.save();

    const book = await Book.findById(borrow.bookId);
    if (book) {
      book.availableCopies += 1;
      await book.save();
    }

    res.json({ message: "Return approved", borrow });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Decline return. Sets status back to Active.
exports.declineReturn = async (req, res) => {
  try {
    const borrowId = req.params.borrowId;

    const borrow = await Borrow.findById(borrowId);
    if (!borrow)
      return res.status(404).json({ message: "Borrow record not found" });
    if (borrow.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "Borrow is not pending return approval" });
    }

    borrow.status = "Active";
    await borrow.save();

    res.json({ message: "Return request declined", borrow });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyBorrows = async (req, res) => {
  try {
    const userId = req.user.id;

    // If admin, fetch all borrows; if student, fetch only their borrows
    const filter = req.user.role === "admin" ? {} : { userId };
    const borrows = await Borrow.find(filter)
      .populate("bookId", "title author image") // ✅ added image
      .populate("userId", "name email studentId");

    res.json(borrows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: View all borrow records
exports.getUserBorrows = async (req, res) => {
  try {
    const borrows = await Borrow.find()
      .populate("userId", "name email studentId")
      .populate("bookId", "title author image avgRating reviewCount");

    res.json(borrows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
