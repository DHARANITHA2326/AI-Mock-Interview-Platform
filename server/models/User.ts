import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role?: 'student' | 'teacher';
  registerNumber?: string;
  department?: string;
  year?: string;
  staffId?: string;
  experienceLevel: string;
  skills: string[];
  streak: number;
  lastActive: string;
  avatarUrl?: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher'], default: 'student' },
    registerNumber: { type: String, trim: true },
    department: { type: String, trim: true },
    year: { type: String, trim: true },
    staffId: { type: String, trim: true },
    experienceLevel: { type: String, default: "Freshers" },
    skills: { type: [String], default: [] },
    streak: { type: Number, default: 1 },
    lastActive: { type: String, default: () => new Date().toISOString() },
    avatarUrl: { type: String }
  },
  {
    timestamps: true
  }
);

// Compiles and exports the User model with explicit Model typing
export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
