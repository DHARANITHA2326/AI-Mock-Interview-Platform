import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProject {
  title: string;
  technologies: string[];
  description: string;
}

export interface IEducation {
  degree: string;
  institution: string;
  year?: string;
}

export interface IInternship {
  role: string;
  company: string;
  duration?: string;
}

export interface IResume extends Document {
  userId: string;
  fileName: string;
  uploadedAt: Date;
  rawText?: string;
  skills: string[];
  projects: IProject[];
  education: IEducation[];
  internships: IInternship[];
  technologies: string[];
  strengths: string[];
  weakAreas: string[];
  suggestedRoles: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema({
  title: { type: String, required: true },
  technologies: { type: [String], default: [] },
  description: { type: String, default: "" }
});

const EducationSchema = new Schema({
  degree: { type: String, required: true },
  institution: { type: String, required: true },
  year: { type: String }
});

const InternshipSchema = new Schema({
  role: { type: String, required: true },
  company: { type: String, required: true },
  duration: { type: String }
});

const ResumeSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    rawText: { type: String },
    skills: { type: [String], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    education: { type: [EducationSchema], default: [] },
    internships: { type: [InternshipSchema], default: [] },
    technologies: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weakAreas: { type: [String], default: [] },
    suggestedRoles: { type: [String], default: [] }
  },
  {
    timestamps: true
  }
);

// Exports model
export const ResumeModel: Model<IResume> = mongoose.models.Resume || mongoose.model<IResume>("Resume", ResumeSchema);
