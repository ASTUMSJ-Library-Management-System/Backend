const expressValidator = require("express-validator");

const { body } = expressValidator;

module.exports.validateRegister = [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
    body("studentId").notEmpty().withMessage("Student ID is required"),
    body("department").notEmpty().withMessage("Department is required"),
    body("password").notEmpty().withMessage("Password is required").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
];

module.exports.validateLogin = [
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
    body("password").notEmpty().withMessage("Password is required").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
];

module.exports.validateRefreshToken = [
    body("refreshToken").notEmpty().withMessage("Refresh token is required")
];

module.exports.validateLoginAdmin = [
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
    body("password").notEmpty().withMessage("Password is required").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
];