const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'id-picture-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("Multer file filter - file:", file);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Add debugging middleware
const debugMiddleware = (req, res, next) => {
  console.log("Debug middleware - Content-Type:", req.get('Content-Type'));
  console.log("Debug middleware - Body keys:", Object.keys(req.body));
  console.log("Debug middleware - File:", req.file);
  next();
};

router.post("/register", upload.single("idPicture"), debugMiddleware, ...validateRegister, handleValidationErrors, register);
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
