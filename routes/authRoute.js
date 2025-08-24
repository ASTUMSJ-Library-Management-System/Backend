const express = require("express");
const { register, login, refreshToken, loginAdmin } = require("../controllers/authController");
const { validateRegister, validateLogin, validateRefreshToken, validateLoginAdmin } = require("../utils/validation/authValidatoion");
const handleValidationErrors = require("../middleware/validationMiddleware");

const router = express.Router();

router.post("/register", ...validateRegister, handleValidationErrors, register);
router.post("/login", ...validateLogin, handleValidationErrors, login);
router.post("/refresh-token", ...validateRefreshToken, handleValidationErrors, refreshToken);
router.post("/login/admin", ...validateLoginAdmin, handleValidationErrors, loginAdmin);

module.exports = router;