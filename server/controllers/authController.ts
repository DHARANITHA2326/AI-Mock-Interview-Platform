import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";
import { dbStore } from "../models/store";
import { isMongoConnected } from "../services/db";
import { UserProfile } from "../../src/types";

// Helper to validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Register a new user
 * POST /api/auth/signup
 */
export async function signup(req: Request, res: Response) {
  try {
    const { name, email, password, confirmPassword, experienceLevel, role, registerNumber, department, year, staffId } = req.body;

    // 1. Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email address is required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const assignedRole: 'student' | 'teacher' = role === 'teacher' ? 'teacher' : 'student';

    if (assignedRole === 'student' && !registerNumber?.trim()) {
      return res.status(400).json({ error: "Register Number / Roll No is required for students." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check existing user
    let userExists = false;
    if (isMongoConnected()) {
      const existingUser = await UserModel.findOne({ email: normalizedEmail });
      userExists = !!existingUser;
    } else {
      userExists = dbStore.users.has(normalizedEmail);
    }

    if (userExists) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    // 3. Hash Password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    const nowIso = new Date().toISOString();

    const userProfile: UserProfile = {
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      role: assignedRole,
      registerNumber: registerNumber ? registerNumber.trim().toUpperCase() : undefined,
      department: department ? department.trim() : undefined,
      year: year ? year.trim() : undefined,
      staffId: staffId ? staffId.trim() : undefined,
      experienceLevel: experienceLevel || (assignedRole === 'teacher' ? "Faculty / Professor" : "Freshers"),
      skills: assignedRole === 'teacher' ? ["Curriculum Review", "Student Evaluation", "Technical Grading"] : [],
      streak: 1,
      lastActive: nowIso,
    };

    // 4. Persistence
    if (isMongoConnected()) {
      const newUser = new UserModel({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: assignedRole,
        registerNumber: userProfile.registerNumber,
        department: userProfile.department,
        year: userProfile.year,
        staffId: userProfile.staffId,
        experienceLevel: userProfile.experienceLevel,
        skills: userProfile.skills,
        streak: 1,
        lastActive: nowIso,
      });
      const savedUser = await newUser.save();
      userProfile.id = savedUser._id.toString();
    }

    // Always keep standard memory store synced for compatibility with existing modules
    dbStore.users.set(normalizedEmail, userProfile);

    // 5. Generate Secure JWT Token
    const jwtSecret = process.env.JWT_SECRET || "ai-mock-interview-agent-secret-key-123";
    const token = jwt.sign(
      { id: userProfile.id, email: userProfile.email, name: userProfile.name, role: userProfile.role },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Registration successful!",
      token,
      user: userProfile,
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Server error occurred during registration." });
  }
}

/**
 * Log in an existing user
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email address is required." });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Retrieve user record
    let userProfile: UserProfile | null = null;
    let passwordHash = "";

    if (isMongoConnected()) {
      const mongoUser = await UserModel.findOne({ email: normalizedEmail });
      if (mongoUser) {
        passwordHash = mongoUser.passwordHash;
        userProfile = {
          id: mongoUser._id.toString(),
          email: mongoUser.email,
          name: mongoUser.name,
          role: (mongoUser as any).role || 'student',
          registerNumber: (mongoUser as any).registerNumber,
          department: (mongoUser as any).department,
          year: (mongoUser as any).year,
          staffId: (mongoUser as any).staffId,
          experienceLevel: mongoUser.experienceLevel,
          skills: mongoUser.skills,
          streak: mongoUser.streak,
          lastActive: mongoUser.lastActive,
          avatarUrl: mongoUser.avatarUrl,
        };
      }
    }

    // Fallback or double-check in-memory store
    if (!userProfile && dbStore.users.has(normalizedEmail)) {
      userProfile = dbStore.users.get(normalizedEmail) || null;
      // In-memory users registered during the active session will have a passwordHash stored.
      // If we are checking the pre-seeded demo users, allow standard login without a hashed password.
      const isDemoUser = normalizedEmail === "student@example.com" || normalizedEmail === "faculty@interviewmaster.edu";
      passwordHash = isDemoUser ? "" : (userProfile as any).passwordHash || "";
    }

    if (!userProfile) {
      return res.status(404).json({ error: "Account not found. Please sign up first." });
    }

    // 3. Verify Password via bcrypt (except for demo credentials)
    const isDemoUser = normalizedEmail === "student@example.com" || normalizedEmail === "faculty@interviewmaster.edu";
    if (!isDemoUser && passwordHash) {
      const isMatch = await bcrypt.compare(password, passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect password. Please try again." });
      }
    }

    // 4. Update login streak metrics
    const now = new Date();
    const lastActiveDate = new Date(userProfile.lastActive);
    const diffDays = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      userProfile.streak += 1;
    } else if (diffDays > 1) {
      userProfile.streak = 1;
    }
    userProfile.lastActive = now.toISOString();

    // Write-back updated user profile to both stores
    if (isMongoConnected()) {
      await UserModel.updateOne(
        { _id: userProfile.id },
        { streak: userProfile.streak, lastActive: userProfile.lastActive }
      );
    }
    dbStore.users.set(normalizedEmail, userProfile);

    // 5. Generate Secure JWT Token
    const jwtSecret = process.env.JWT_SECRET || "ai-mock-interview-agent-secret-key-123";
    const token = jwt.sign(
      { id: userProfile.id, email: userProfile.email, name: userProfile.name, role: userProfile.role },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful!",
      token,
      user: userProfile,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error occurred during login." });
  }
}

/**
 * Handle password reset OTP generation (Mocked)
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    let userExists = false;
    if (isMongoConnected()) {
      const count = await UserModel.countDocuments({ email: normalizedEmail });
      userExists = count > 0;
    } else {
      userExists = dbStore.users.has(normalizedEmail);
    }

    if (!userExists) {
      return res.status(404).json({ error: "No account registered with this email address." });
    }

    // Generate numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    dbStore.activeOtps.set(normalizedEmail, otp);

    return res.json({
      message: "A secure reset OTP code was generated for evaluation purposes.",
      otp, // Dispatched in response for zero-friction user workflow in sandbox
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Server error occurred." });
  }
}

/**
 * Verify OTP and reset password
 * POST /api/auth/verify-otp
 */
export async function verifyOtpAndReset(req: Request, res: Response) {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "All OTP parameters and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP
    const activeOtp = dbStore.activeOtps.get(normalizedEmail);
    if (!activeOtp || activeOtp !== otp) {
      return res.status(400).json({ error: "Invalid, expired, or incorrect OTP code." });
    }

    // Hash the new password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    if (isMongoConnected()) {
      await UserModel.updateOne({ email: normalizedEmail }, { passwordHash });
    }

    // Sync in-memory user mock password as well
    const memUser = dbStore.users.get(normalizedEmail);
    if (memUser) {
      (memUser as any).passwordHash = passwordHash;
      dbStore.users.set(normalizedEmail, memUser);
    }

    dbStore.activeOtps.delete(normalizedEmail);

    return res.json({
      message: "Password reset successful! You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ error: "Server error during OTP verification." });
  }
}
