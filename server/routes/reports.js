const express = require("express");
const Student = require("../models/Student");
const Course = require("../models/Course");
const User = require("../models/User");
const { auth, authorize } = require("../middleware/auth"); // Add authorize import

const router = express.Router();

// @desc    Get attendance report
// @route   GET /api/reports/attendance
// @access  Private (Admin, Teacher)
router.get(
  "/attendance",
  auth,
  authorize("admin", "teacher"),
  async (req, res) => {
    try {
      const { startDate, endDate, courseId } = req.query;

      // This would query your actual attendance records
      // For now, returning mock structure
      const attendanceReport = {
        summary: {
          totalStudents: 45,
          present: 38,
          absent: 7,
          attendanceRate: 84.4,
        },
        details: [
          {
            studentId: "STU0001",
            studentName: "John Smith",
            present: 18,
            absent: 2,
            percentage: 90.0,
          },
          // ... more students
        ],
      };

      res.json({
        success: true,
        data: attendanceReport,
      });
    } catch (error) {
      console.error("Attendance report error:", error);
      res.status(500).json({
        success: false,
        message: "Error generating attendance report",
      });
    }
  }
);

// ... rest of the reports.js code

// @desc    Get grade report
// @route   GET /api/reports/grades
// @access  Private (Admin, Teacher)
router.get("/grades", auth, authorize("admin", "teacher"), async (req, res) => {
  try {
    const { semester, courseId } = req.query;

    const gradeReport = {
      semester: semester || "Fall 2024",
      course: courseId ? await Course.findById(courseId) : null,
      grades: [
        {
          studentId: "STU0001",
          studentName: "John Smith",
          course: "CS101",
          grade: "A",
          points: 4.0,
        },
        // ... more grades
      ],
      statistics: {
        averageGPA: 3.45,
        totalStudents: 45,
        gradeDistribution: {
          A: 12,
          B: 18,
          C: 10,
          D: 4,
          F: 1,
        },
      },
    };

    res.json({
      success: true,
      data: gradeReport,
    });
  } catch (error) {
    console.error("Grade report error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating grade report",
    });
  }
});

// @desc    Get student performance report
// @route   GET /api/reports/student-performance
// @access  Private (Admin, Teacher)
router.get(
  "/student-performance",
  auth,
  authorize("admin", "teacher"),
  async (req, res) => {
    try {
      const { studentId } = req.query;

      const student = await Student.findOne({ studentId }).populate(
        "user",
        "name email"
      );
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      const performanceReport = {
        student: {
          id: student._id,
          studentId: student.studentId,
          name: student.user.name,
          grade: student.grade,
          course: student.course,
        },
        academicPerformance: {
          cumulativeGPA: 3.75,
          completedCredits: 45,
          currentSemesterGPA: 3.8,
        },
        courseGrades: [
          {
            courseCode: "CS101",
            courseName: "Introduction to Computer Science",
            grade: "A",
            credits: 3,
            semester: "Fall 2024",
          },
          // ... more courses
        ],
      };

      res.json({
        success: true,
        data: performanceReport,
      });
    } catch (error) {
      console.error("Student performance report error:", error);
      res.status(500).json({
        success: false,
        message: "Error generating student performance report",
      });
    }
  }
);

module.exports = router;
