const express = require("express");
const router = express.Router();

const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");
const User = require("../models/User");
const Book = require("../models/Book");
const Borrow = require("../models/Borrow");
const Payment = require("../models/Payment");

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

router.get(
  "/admin/stats",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
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
              availableCopies: { $sum: "$availableCopies" },
              totalCopies: { $sum: "$totalCopies" },
              uniqueBooks: { $sum: 1 },
              availableUniqueBooks: {
                $sum: { $cond: [{ $gt: ["$availableCopies", 0] }, 1, 0] },
              },
            },
          },
        ]),
      ]);

      const availableCopies = booksAgg[0]?.availableCopies || 0;
      const availableUniqueBooks = booksAgg[0]?.availableUniqueBooks || 0;

      res.json({
        totalUsers,
        totalBooks,
        availableBooks: availableUniqueBooks,
        availableCopies,
        pendingPayments,
        activeBorrows,
        overdueBorrows,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch stats", error: error.message });
    }
  }
);

router.get(
  "/admin/users",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const users = await User.find(
        {},
        "name email studentId department role createdAt"
      );

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
        borrowAgg.map((b) => [
          String(b._id),
          {
            totalBorrowed: b.totalBorrowed,
            currentBorrowed: b.currentBorrowed,
          },
        ])
      );

      const { start, end } = getCurrentMonthRange();
      const paymentAgg = await Payment.aggregate([
        { $match: { createdAt: { $gte: start, $lt: end } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$userId", status: { $first: "$status" } } },
      ]);
      const paymentMap = new Map(
        paymentAgg.map((p) => [String(p._id), p.status])
      );

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
      res
        .status(500)
        .json({ message: "Failed to fetch users", error: error.message });
    }
  }
);

// Update user status (approve/reject)
router.patch(
  "/admin/users/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!["Approved", "Rejected", "Pending"].includes(status)) {
        return res.status(400).json({
          message:
            "Invalid status. Must be 'Approved', 'Rejected', or 'Pending'",
        });
      }

      // Update user status in Payment collection for current month
      const { start, end } = getCurrentMonthRange();
      const payment = await Payment.findOneAndUpdate(
        {
          userId: id,
          createdAt: { $gte: start, $lt: end },
        },
        { status },
        {
          new: true,
          upsert: true, // Create if doesn't exist
        }
      );

      if (!payment) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: `User status updated to ${status}`,
        status,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({
        message: "Failed to update user status",
        error: error.message,
      });
    }
  }
);

// Delete user
router.delete(
  "/admin/users/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has active borrows
      const activeBorrows = await Borrow.countDocuments({
        userId: id,
        status: "Active",
      });

      if (activeBorrows > 0) {
        return res.status(400).json({
          message:
            "Cannot delete user with active book borrows. Please return all books first.",
        });
      }

      // Delete user and related data
      await Promise.all([
        User.findByIdAndDelete(id),
        Borrow.deleteMany({ userId: id }),
        Payment.deleteMany({ userId: id }),
      ]);

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        message: "Failed to delete user",
        error: error.message,
      });
    }
  }
);

router.get("/user/me/summary", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = getCurrentMonthRange();

    const [activeCount, booksAgg, paymentDoc, borrows] = await Promise.all([
      Borrow.countDocuments({ userId, status: "Active" }),
      Book.aggregate([
        {
          $group: {
            _id: null,
            availableCopies: { $sum: "$availableCopies" },
            availableUniqueBooks: {
              $sum: { $cond: [{ $gt: ["$availableCopies", 0] }, 1, 0] },
            },
          },
        },
      ]),
      Payment.findOne({ userId, createdAt: { $gte: start, $lt: end } }).sort({
        createdAt: -1,
      }),
      Borrow.find({ userId, status: "Active" }).populate(
        "bookId",
        "title author"
      ),
    ]);

    const availableCopies = booksAgg[0]?.availableCopies || 0;
    const availableUniqueBooks = booksAgg[0]?.availableUniqueBooks || 0;
    const status = paymentDoc?.status || "Pending";

    res.json({
      booksBorrowed: activeCount,
      availableBooks: availableUniqueBooks, // Number of unique books with available copies
      availableCopies, // Total number of available copies
      payment: { status, isPaid: status === "Approved" },
      currentBorrows: borrows.map((b) => ({
        id: b._id,
        book: {
          id: b.bookId?._id,
          title: b.bookId?.title,
          author: b.bookId?.author,
        },
        borrowDate: b.borrowDate,
        dueDate: b.dueDate,
        status: b.status,
      })),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch summary", error: error.message });
  }
});

module.exports = router;
