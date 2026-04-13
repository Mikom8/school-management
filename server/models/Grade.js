const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    grade: {
      type: String,
      required: true,
      enum: ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"],
    },
    semester: {
      type: String,
      required: true,
    },
    comments: {
      type: String,
      trim: true,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gradedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one grade per student per course per semester
gradeSchema.index({ student: 1, course: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("Grade", gradeSchema);
