const express = require("express");
const router = express.Router();
const { borrowBook, requestReturn, approveReturn, declineReturn, getUserBorrows, getMyBorrows } = require("../controllers/borrowController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

router.post("/:bookId", authMiddleware, borrowBook);
router.get("/", authMiddleware, getUserBorrows);
router.get("/myBorrows", authMiddleware, getMyBorrows);

// Student creates return request
router.put("/return/:borrowId", authMiddleware, requestReturn);

// Admin approves or declines
router.put("/return/:borrowId/approve", adminMiddleware, approveReturn);
router.put("/return/:borrowId/decline", adminMiddleware, declineReturn);

module.exports = router;
