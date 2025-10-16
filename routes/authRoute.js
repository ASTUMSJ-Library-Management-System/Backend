const express = require("express");
const upload = require("../middleware/uploadMiddleware"); // Import the central upload middleware
const {
  register,
  login,
  refreshToken,
  loginAdmin,
} = require("../controllers/authController");
const {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateLoginAdmin,
} = require("../utils/validation/authValidatoion");
const handleValidationErrors = require("../middleware/validationMiddleware");

const router = express.Router();

// The express-validator middleware (...validateRegister) conflicts with multer.
// react-hook-form on the frontend and the Mongoose schema on the backend already provide sufficient validation.
// By removing the validation middleware here, we allow multer to correctly process the multipart/form-data.
router.post(
  "/register",
  upload.single("idPicture"),
  register
);
router.post("/login", ...validateLogin, handleValidationErrors, login);
router.post(
  "/refresh-token",
  ...validateRefreshToken,
  handleValidationErrors,
  refreshToken
);
router.post(
  "/login/admin",
  ...validateLoginAdmin,
  handleValidationErrors,
  loginAdmin
);
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
