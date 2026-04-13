const express = require("express");
const User = require("../models/User");
const Activity = require("../models/Activity");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get all teachers with pagination and search
router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    
    let query = { role: "teacher" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const teachers = await User.find(query)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: teachers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Get teacher by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const teacher = await User.findOne({
      _id: req.params.id,
      role: "teacher",
    }).select("-password");

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Create teacher
router.post("/", auth, async (req, res) => {
  try {
    const teacher = new User({
      ...req.body,
      role: "teacher",
    });
    await teacher.save();

    try {
      await Activity.create({
        type: "teacher_added",
        description: `Added faculty: ${teacher.name}`,
        user: req.user ? req.user.name : "Admin",
      });
    } catch (err) { console.error("Activity log error:", err); }

    res.status(201).json({
      _id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE TEACHER - ADD THIS ROUTE
router.put("/:id", auth, async (req, res) => {
  try {
    const { name, email, isActive } = req.body;
    
    const teacher = await User.findOneAndUpdate(
      { _id: req.params.id, role: "teacher" },
      { name, email, isActive },
      { new: true, runValidators: true }
    ).select("-password");

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json(teacher);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE TEACHER - ADD THIS ROUTE
router.delete("/:id", auth, async (req, res) => {
  try {
    const teacher = await User.findOneAndDelete({
      _id: req.params.id,
      role: "teacher"
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    try {
      await Activity.create({
        type: "teacher_deleted",
        description: `Removed faculty: ${teacher.name}`,
        user: req.user ? req.user.name : "Admin",
      });
    } catch (err) { console.error("Activity log error:", err); }

    res.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;