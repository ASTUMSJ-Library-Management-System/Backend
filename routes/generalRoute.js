const express = require("express");
const router = express.Router();

const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Book = require("../models/Book");
const Borrow = require("../models/Borrow");
const Payment = require("../models/Payment");

// Helper to get current month range
function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

// ADMIN: Stats for dashboard
router.get("/admin/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [
      totalUsers,
      totalBooks,
      pendingPayments,
      activeBorrows,
      overdueBorrows,
      booksAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Book.countDocuments(),
      Payment.countDocuments({ status: "Pending" }),
      Borrow.countDocuments({ status: "Active" }),
      Borrow.countDocuments({ status: "Overdue" }),
      Book.aggregate([
        {
          $group: {
            _id: null,
            availableBooks: { $sum: "$availableCopies" },
            totalCopies: { $sum: "$totalCopies" },
          },
        },
      ]),
    ]);

    const availableBooks = booksAgg[0]?.availableBooks || 0;

    res.json({
      totalUsers,
      totalBooks,
      availableBooks,
      pendingPayments,
      activeBorrows,
      overdueBorrows,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
});

// ADMIN: Users list with computed fields
router.get("/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, "name email studentId department role createdAt");

    // Aggregate borrow counts per user
    const borrowAgg = await Borrow.aggregate([
      {
        $group: {
          _id: "$userId",
          totalBorrowed: { $sum: 1 },
          currentBorrowed: {
            $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
          },
        },
      },
    ]);
    const borrowMap = new Map(
      borrowAgg.map((b) => [String(b._id), { totalBorrowed: b.totalBorrowed, currentBorrowed: b.currentBorrowed }])
    );

    // Get latest payment status for the current month per user
    const { start, end } = getCurrentMonthRange();
    const paymentAgg = await Payment.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$userId", status: { $first: "$status" } } },
    ]);
    const paymentMap = new Map(paymentAgg.map((p) => [String(p._id), p.status]));

    const result = users.map((u) => {
      const b = borrowMap.get(String(u._id)) || {
        totalBorrowed: 0,
        currentBorrowed: 0,
      };
      const status = paymentMap.get(String(u._id)) || "Pending";
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        studentId: u.studentId,
        department: u.department,
        role: u.role,
        currentBorrowed: b.currentBorrowed,
        totalBorrowed: b.totalBorrowed,
        status,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
});

// USER: Member summary for dashboard
router.get("/user/me/summary", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = getCurrentMonthRange();

    const [activeCount, booksAgg, paymentDoc, borrows] = await Promise.all([
      Borrow.countDocuments({ userId, status: "Active" }),
      Book.aggregate([{ $group: { _id: null, availableBooks: { $sum: "$availableCopies" } } }]),
      Payment.findOne({ userId, createdAt: { $gte: start, $lt: end } }).sort({ createdAt: -1 }),
      Borrow.find({ userId, status: "Active" }).populate("bookId", "title author"),
    ]);

    const availableBooks = booksAgg[0]?.availableBooks || 0;
    const status = paymentDoc?.status || "Pending";

    res.json({
      booksBorrowed: activeCount,
      availableBooks,
      payment: { status, isPaid: status === "Approved" },
      currentBorrows: borrows.map((b) => ({
        id: b._id,
        book: { id: b.bookId?._id, title: b.bookId?.title, author: b.bookId?.author },
        borrowDate: b.borrowDate,
        dueDate: b.dueDate,
        status: b.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch summary", error: error.message });
  }
});

module.exports = router;
