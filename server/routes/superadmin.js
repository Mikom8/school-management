const express = require("express");
const User = require("../models/User");
const Student = require("../models/Student");
const Activity = require("../models/Activity");
const { auth, authorize } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// All routes require superadmin
router.use(auth, authorize("superadmin"));

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all users (any role) with pagination / filter
// @route   GET /api/superadmin/users
// ─────────────────────────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("SuperAdmin get users error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create admin account
// @route   POST /api/superadmin/create-admin
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/create-admin",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, email, password } = req.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists",
        });
      }

      const admin = await User.create({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role: "admin",
      });

      try {
        await Activity.create({
          type: "admin_added",
          description: `SuperAdmin created admin account: ${name.trim()}`,
          user: req.user.name,
        });
      } catch (_) {}

      res.status(201).json({
        success: true,
        message: "Admin account created successfully",
        data: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error("Create admin error:", error);
      res.status(500).json({ success: false, message: "Server error: " + error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create teacher account
// @route   POST /api/superadmin/create-teacher
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/create-teacher",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, email, password } = req.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists",
        });
      }

      const teacher = await User.create({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role: "teacher",
      });

      try {
        await Activity.create({
          type: "teacher_added",
          description: `SuperAdmin created teacher account: ${name.trim()}`,
          user: req.user.name,
        });
      } catch (_) {}

      res.status(201).json({
        success: true,
        message: "Teacher account created successfully",
        data: {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          role: teacher.role,
        },
      });
    } catch (error) {
      console.error("Create teacher error:", error);
      res.status(500).json({ success: false, message: "Server error: " + error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create student account (with student record)
// @route   POST /api/superadmin/create-student
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/create-student",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("grade")
      .isIn(["Remedial", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"])
      .withMessage("Invalid grade"),
    body("parentName").trim().notEmpty().withMessage("Parent name is required"),
    body("parentContact").trim().notEmpty().withMessage("Parent contact is required"),
    body("semester")
      .isIn(["1st Semester", "2nd Semester"])
      .withMessage("Invalid semester"),
  ],
  async (req, res) => {
    let createdUser = null;
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        name, email, password, grade, dateOfBirth,
        parentName, parentContact, address, emergencyContact,
        semester, course, department,
      } = req.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists",
        });
      }

      createdUser = await User.create({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role: "student",
      });

      const student = await Student.create({
        user: createdUser._id,
        name: name.trim(),
        grade,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date("2000-01-01"),
        parentName: parentName.trim(),
        parentContact: parentContact.trim(),
        address: address || {},
        emergencyContact: emergencyContact ? emergencyContact.trim() : parentContact.trim(),
        semester,
        course: course ? course.trim() : "",
        department: department || null,
      });

      await student.populate("user", "name email");

      try {
        await Activity.create({
          type: "student_added",
          description: `SuperAdmin created student: ${name.trim()}`,
          user: req.user.name,
        });
      } catch (_) {}

      res.status(201).json({
        success: true,
        message: "Student account created successfully",
        data: student,
      });
    } catch (error) {
      console.error("Create student error:", error);
      if (createdUser) {
        try { await User.findByIdAndDelete(createdUser._id); } catch (_) {}
      }
      res.status(500).json({ success: false, message: "Server error: " + error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Toggle user active/inactive
// @route   PATCH /api/superadmin/users/:id/toggle-active
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/users/:id/toggle-active", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.role === "superadmin") {
      return res.status(403).json({ success: false, message: "Cannot deactivate superadmin" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: { id: user._id, isActive: user.isActive },
    });
  } catch (error) {
    console.error("Toggle active error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete any user (except superadmin)
// @route   DELETE /api/superadmin/users/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.role === "superadmin") {
      return res.status(403).json({ success: false, message: "Cannot delete superadmin" });
    }

    // If student, also remove student record
    if (user.role === "student") {
      await Student.findOneAndDelete({ user: user._id });
    }

    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
