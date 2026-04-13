const express = require("express");
const Course = require("../models/Course");
const Student = require("../models/Student");
const { auth } = require("../middleware/auth");

const router = express.Router();

// @desc    Get user schedule
// @route   GET /api/schedule
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let schedule = [];

    if (userRole === "teacher") {
      // Get courses taught by this teacher for today
      const courses = await Course.find({ teacher: userId })
        .populate("teacher", "name")
        .select("name code schedule");

      // Convert courses to schedule items
      schedule = courses.map((course) => ({
        id: course._id,
        title: course.name,
        courseCode: course.code,
        type: "lecture",
        schedule: course.schedule,
        time: `${course.schedule.startTime} - ${course.schedule.endTime}`,
        room: course.schedule.room || "TBA",
        days: course.schedule.days || [],
      })).filter(course => course.days.includes(getCurrentDay()));

    } else if (userRole === "student") {
      // Get courses enrolled by this student for today
      const student = await Student.findOne({ user: userId });
      if (student) {
        const courses = await Course.find({ enrolledStudents: student._id })
          .populate("teacher", "name")
          .select("name code schedule teacher");

        schedule = courses.map((course) => ({
          id: course._id,
          title: course.name,
          courseCode: course.code,
          type: "lecture",
          schedule: course.schedule,
          time: `${course.schedule.startTime} - ${course.schedule.endTime}`,
          room: course.schedule.room || "TBA",
          instructor: course.teacher.name,
          days: course.schedule.days || [],
        })).filter(course => course.days.includes(getCurrentDay()));
      }
    }

    // Sort by time
    schedule.sort((a, b) => {
      const timeA = a.schedule.startTime || "00:00";
      const timeB = b.schedule.startTime || "00:00";
      return timeA.localeCompare(timeB);
    });

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error("Schedule fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching schedule",
    });
  }
});

// Helper function to get current day
function getCurrentDay() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}

module.exports = router;