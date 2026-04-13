// Add this route to server/routes/students.js
const express = require("express");
const Student = require("../models/Student");
const User = require("../models/User");
const Course = require("../models/Course");
const Activity = require("../models/Activity");
const { auth, authorize } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// @desc    Register new student (with user account)
// @route   POST /api/students/register
// @access  Private (Admin)
router.post(
  "/register",
  [
    auth,
    authorize("admin"),
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please include a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("grade")
      .isIn([
        "Remedial",
        "1st Year Degree",
        "2nd Year Degree",
        "3rd Year Degree",
        "4th Year Degree",
        "5th Year Degree",
        "1st-3rd Year Diploma",
      ])
      .withMessage("Invalid grade"),
    body("parentName").trim().notEmpty().withMessage("Parent name is required"),
    body("parentContact")
      .trim()
      .notEmpty()
      .withMessage("Parent contact is required"),
    body("emergencyContact").optional().trim(),
    body("dateOfBirth")
      .optional()
      .isISO8601()
      .withMessage("Invalid date format"),
    body("course").optional().trim(),
    body("department").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        name,
        email,
        password,
        grade,
        dateOfBirth,
        parentName,
        parentContact,
        address,
        emergencyContact,
        course,
        department,
      } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this email",
        });
      }

      // Create user first
      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role: "student",
      });

      // Get student count for ID generation
      const studentCount = await Student.countDocuments();
      const studentId = `STU${String(studentCount + 1).padStart(4, "0")}`;

      // Create student record with manual ID
      const student = await Student.create({
        user: user._id,
        name: name.trim(),
        studentId: studentId,
        grade,
        dateOfBirth: dateOfBirth
          ? new Date(dateOfBirth)
          : new Date("2000-01-01"),
        parentName: parentName.trim(),
        parentContact: parentContact.trim(),
        address: address || {},
        emergencyContact: emergencyContact
          ? emergencyContact.trim()
          : parentContact.trim(),
        course: course ? course.trim() : "",
        department: department ? department.trim() : "",
      });

      await student.populate("user", "name email");

      try {
        await Activity.create({
          type: "student_added",
          description: `Registered structured student: ${name.trim()}`,
          user: req.user ? req.user.name : "Admin",
        });
      } catch (err) { console.error("Activity log error:", err); }

      res.status(201).json({
        success: true,
        data: student,
      });
    } catch (error) {
      console.error("Student registration error:", error);

      // If there's a user created but student failed, delete the user
      if (req.body.email) {
        try {
          await User.findOneAndDelete({ email: req.body.email.toLowerCase() });
        } catch (deleteError) {
          console.error("Error cleaning up user:", deleteError);
        }
      }

      res.status(500).json({
        success: false,
        message: "Server error during student registration: " + error.message,
      });
    }
  }
);

// ... rest of your student routes

// @desc    Get all students with pagination
// @route   GET /api/students
// @access  Private (Admin, Teacher)
router.get("/", auth, authorize("admin", "teacher"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (req.user.role === "teacher") {
      const teacherCourses = await Course.find({ teacher: req.user._id });
      if (teacherCourses.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
      
      const enrolledStudentIds = [];
      const courseNames = [];
      
      teacherCourses.forEach(c => {
        if (c.enrolledStudents) enrolledStudentIds.push(...c.enrolledStudents);
        if (c.name) courseNames.push(new RegExp("^" + c.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + "$", "i"));
      });
      
      query = {
        $or: [
          { _id: { $in: enrolledStudentIds } },
          { course: { $in: courseNames } }
        ]
      };
    }

    const students = await Student.find(query)
      .populate("user", "name email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Student.countDocuments(query);

    res.json({
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching students",
    });
  }
});

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Students can only view their own profile unless admin/teacher
    if (
      req.user.role === "student" &&
      student.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Get student error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching student",
    });
  }
});

// @desc    Create student
// @route   POST /api/students
// @access  Private (Admin)
router.post(
  "/",
  [
    auth,
    authorize("admin"),
    body("grade")
      .isIn([
        "Remedial",
        "1st Year Degree",
        "2nd Year Degree",
        "3rd Year Degree",
      ])
      .withMessage("Invalid grade"),
    body("parentName").notEmpty().withMessage("Parent name is required"),
    body("parentContact").notEmpty().withMessage("Parent contact is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const student = await Student.create(req.body);

      await student.populate("user", "name email");

      res.status(201).json({
        success: true,
        data: student,
      });
    } catch (error) {
      console.error("Create student error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating student",
      });
    }
  }
);

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Admin)
router.put("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("user", "name email");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating student",
    });
  }
});

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin)
router.delete("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Also delete the associated user
    await User.findByIdAndDelete(student.user);

    await Student.findByIdAndDelete(req.params.id);

    try {
      await Activity.create({
        type: "student_deleted",
        description: `Deleted student: ${student.name}`,
        user: req.user ? req.user.name : "Admin",
      });
    } catch (err) { console.error("Activity log error:", err); }

    res.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting student",
    });
  }
});
// @desc    Get available main courses for student registration
// @route   GET /api/students/available-courses
// @access  Private (Admin)
router.get("/available-courses", auth, authorize("admin"), async (req, res) => {
  try {
    // Get distinct course names first
    const distinctCourseNames = await Course.distinct("name", { isActive: true });
    
    console.log(`Found ${distinctCourseNames.length} distinct course names`);
    
    // For each distinct name, get the first course record
    const mainCourses = [];
    
    for (const courseName of distinctCourseNames) {
      const firstCourse = await Course.findOne({ 
        name: courseName, 
        isActive: true 
      }).select("name code description credits");
      
      if (firstCourse) {
        mainCourses.push({
          _id: firstCourse._id,
          name: firstCourse.name,
          code: firstCourse.code.split('-')[0],
          description: firstCourse.description || "Main Course",
          credits: firstCourse.credits
        });
      }
    }
    
    // Sort by name
    mainCourses.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Returning ${mainCourses.length} unique main courses`);
    
    res.json({
      success: true,
      data: mainCourses,
    });
  } catch (error) {
    console.error("Get available courses error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching available courses: " + error.message,
    });
  }
});

module.exports = router;
