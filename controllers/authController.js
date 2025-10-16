const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Email = require("../email");

// Helper: return safe user data (exclude password)
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  studentId: user.studentId || null,
  department: user.department,
  idPicture: user.idPicture,
  role: user.role,
});

module.exports.register = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    console.log("Request files:", req.files);
    console.log("Content-Type:", req.get("Content-Type"));

    const { name, email, studentId, department, role, password } = req.body;

    // Check if ID picture was uploaded
    if (!req.file) {
      console.log("No file found in request");
      return res.status(400).json({ message: "ID picture is required" });
    }

    console.log("Uploaded file info:", req.file);
    console.log("File path:", req.file.path);

    // Use local file path instead of Cloudinary
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      studentId,
      department,
      idPicture: req.file.path, // Local file path
      role,
      password: hashedPassword,
    });

    console.log("Created user with idPicture:", user.idPicture);

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Immediately send the success response to the user
    res.status(201).json({
      user: sanitizeUser(user),
      token,
      refreshToken,
    });

    // Send the welcome email in the background.
    // This is a "fire and forget" operation. If it fails, it will log an error
    // but it won't affect the user's successful registration.
    Email.sendRegistrationEmail(user).catch(emailError => {
      console.error(`Failed to send welcome email to ${user.email} after registration:`, emailError);
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(200).json({
      user: sanitizeUser(user),
      token,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Security Fix: Ensure the user has the 'admin' role before allowing login.
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Not an administrator." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(200).json({
      user: sanitizeUser(user),
      token,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
