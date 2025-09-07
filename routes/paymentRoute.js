const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");
const Payment = require("../models/Payment");

router.post(
  "/",
  authMiddleware,
  upload.single("screenshot"),
  async (req, res) => {
    try {
      const userId = req.user.id;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const approvedPayment = await Payment.findOne({
        userId,
        status: "Approved",
        createdAt: {
          $gte: new Date(currentYear, currentMonth, 1),
          $lt: new Date(currentYear, currentMonth + 1, 1),
        },
      });

      if (approvedPayment) {
        return res
          .status(400)
          .json({
            message:
              "You already have an approved payment for this month. One payment per month is allowed.",
          });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No screenshot uploaded" });
      }

      const payment = await Payment.create({
        userId,
        screenshotUrl: req.file.path,
        reference: req.body.reference,
        status: "Pending",
      });

      res
        .status(201)
        .json({ message: "Payment submitted successfully", payment });
    } catch (error) {
      console.error("Payment upload error:", error);
      res
        .status(500)
        .json({ message: "Error uploading payment", error: error.message });
    }
  }
);

router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("userId", "username email")
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching payments", error: err.message });
  }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.json({ message: `Payment ${status}`, payment });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating payment", error: err.message });
  }
});

router.get("/myPayments", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching payments", error: err.message });
  }
});

router.get("/isPaid", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const payment = await Payment.findOne({
      userId,
      status: "Approved",
      createdAt: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1),
      },
    });

    res.json({ isPaid: !!payment });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error checking payment status", error: err.message });
  }
});

module.exports = router;
