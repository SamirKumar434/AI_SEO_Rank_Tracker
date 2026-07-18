// server/models/analysisModel.js
import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending"
  },
  // SEO Metrics from Gemini
  overallScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  categories: {
    type: Map,
    of: Number,
    default: {}
  },
  // Scraped Data - ✅ FIXED: Changed to store arrays of strings
  metaData: {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    keywords: { type: String, default: "" },
    robots: { type: String, default: "" },
    canonical: { type: String, default: "" },
    ogTitle: { type: String, default: "" },
    ogDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    twitterCard: { type: String, default: "" },
    viewport: { type: String, default: "" },
    charset: { type: String, default: "" }
  },
  headings: {
    h1: { type: [String], default: [] },  // ✅ Changed to array of strings
    h2: { type: [String], default: [] },  // ✅ Changed to array of strings
    h3: { type: [String], default: [] },  // ✅ Changed to array of strings
    h4: { type: [String], default: [] },  // ✅ Changed to array of strings
    h5: { type: [String], default: [] },  // ✅ Changed to array of strings
    h6: { type: [String], default: [] }   // ✅ Changed to array of strings
  },
  links: {
    internal: { type: Number, default: 0 },
    external: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  images: {
    total: { type: Number, default: 0 },
    withAlt: { type: Number, default: 0 },
    missingAlt: { type: Number, default: 0 },
    list: { type: [String], default: [] }
  },
  // AI Analysis Results
  keywords: [{
    word: String,
    count: Number,
    density: Number
  }],
  issues: [{
    severity: { 
      type: String, 
      enum: ["critical", "warning", "info"] 
    },
    category: String,
    message: String,
    recommendation: String
  }],
  // Performance Metrics
  loadTime: {
    type: Number,
    default: 0
  },
  pageSize: {
    type: Number,
    default: 0
  },
  wordCount: {
    type: Number,
    default: 0
  },
  lastChecked: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Indexes for efficient queries
analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ userId: 1, url: 1 });

const Analysis = mongoose.model("Analysis", analysisSchema);
export default Analysis;