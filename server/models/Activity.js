const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "student_added",
        "student_updated",
        "student_deleted",
        "teacher_added",
        "teacher_updated",
        "teacher_deleted",
        "course_added",
        "course_updated",
        "course_deleted",
        "login",
        "other",
      ],
    },
    description: {
      type: String,
      required: true,
    },
    user: {
      type: String, // E.g., user name or "Admin"
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

module.exports = mongoose.model("Activity", activitySchema);
