const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    console.log("🟢 AUTH MIDDLEWARE: Starting...");
    console.log("🟢 AUTH: Request path:", req.path);
    
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
      console.log("🟢 AUTH: Token found, length:", token.length);
    } else {
      console.log("🔴 AUTH: No token found in headers");
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    if (!token) {
      console.log("🔴 AUTH: Token is empty");
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    console.log("🟢 AUTH: Verifying token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallbacksecret");
    console.log("🟢 AUTH: Token decoded successfully, user ID:", decoded.id);
    
    console.log("🟢 AUTH: Finding user in database...");
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      console.log("🔴 AUTH: User not found in database");
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!user.isActive) {
      console.log("🔴 AUTH: User account is inactive");
      return res.status(401).json({
        success: false,
        message: "Account is deactivated.",
      });
    }

    req.user = user;
    console.log("🟢 AUTH: SUCCESS - User authenticated:", user.name, "Role:", user.role);
    console.log("🟢 AUTH: Calling next() middleware...");
    next();
    
  } catch (error) {
    console.error("❌ AUTH MIDDLEWARE ERROR:", error.message);
    console.error("❌ AUTH ERROR Stack:", error.stack);
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    console.log("🟢 AUTHORIZE MIDDLEWARE: Starting authorization check");
    console.log("🟢 AUTHORIZE: User role:", req.user?.role);
    console.log("🟢 AUTHORIZE: Required roles:", roles);
    
    if (!req.user) {
      console.log("🔴 AUTHORIZE: No user object found - authentication failed");
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    console.log("🟢 AUTHORIZE: Checking if", req.user.role, "is in", roles);
    
    if (!roles.includes(req.user.role)) {
      console.log("🔴 AUTHORIZE: User role not authorized");
      console.log("🔴 AUTHORIZE: User has role:", req.user.role, "but requires one of:", roles);
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }

    console.log("🟢 AUTHORIZE: SUCCESS - User authorized");
    console.log("🟢 AUTHORIZE: Calling next() to proceed to route handler");
    next();
  };
};


module.exports = { auth, authorize };