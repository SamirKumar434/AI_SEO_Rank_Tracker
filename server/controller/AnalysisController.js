// server/controllers/analysisController.js
import Analysis from "../models/Analysis.js";
import { analyseSeoData } from "../services/geminiServices.js";
import { scrapeUrl } from '../services/scrapperService.js';

// Analyze a URL
export const analyzeUrl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: "URL is required" });
    }

    // Validate URL format
    let validUrl;
    try {
      validUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch (error) {
      return res.status(400).json({ success: false, message: "Invalid URL format" });
    }

    // Create analysis record
    const analysis = await Analysis.create({ 
      userId: req.userId, 
      url: validUrl.href, 
      status: "processing" 
    });

    // Send immediate response
    res.json({ success: true, message: "Analysis started", analysisId: analysis._id });

    // Run background analysis with a timeout wrapper
    processAnalysisWithTimeout(analysis, validUrl.href);

  } catch (error) {
    console.error("[ANALYSIS] Analyze URL error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
};

// Process analysis with timeout protection
async function processAnalysisWithTimeout(analysis, url, timeoutMs = 120000) { // 2 minutes timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Analysis timeout after ${timeoutMs/1000} seconds`)), timeoutMs);
  });

  try {
    await Promise.race([
      processAnalysisInBackground(analysis, url),
      timeoutPromise
    ]);
  } catch (error) {
    console.error("[ANALYSIS] Background processing failed:", error.message);
    try {
      analysis.status = "failed";
      analysis.issues = [{
        severity: "critical",
        category: "technical",
        message: "Analysis timed out or failed",
        recommendation: "Please try again. If the issue persists, the website might be blocking our requests."
      }];
      await analysis.save();
    } catch (saveError) {
      console.error("[ANALYSIS] Failed to save failed status:", saveError.message);
    }
  }
}

// Background processing function
async function processAnalysisInBackground(analysis, url) {
  try {
    console.log(`[ANALYSIS] Starting background processing for: ${url}`);
    
    // Step 1: Scrape the URL
    const scrapeResult = await scrapeUrl(url);

    if (!scrapeResult || !scrapeResult.success) {
      console.error("[ANALYSIS] Scrape failed:", scrapeResult?.error || "Unknown error");
      analysis.status = "failed";
      analysis.issues = [{
        severity: "critical",
        category: "technical",
        message: "Failed to scrape website",
        recommendation: "Check if the URL is accessible and try again."
      }];
      await analysis.save();
      return;
    }

    console.log("[ANALYSIS] Scrape successful, analyzing with Gemini...");

    // Step 2: Analyze with Gemini AI
    const aiResult = await analyseSeoData(scrapeResult.data);
    
    if (!aiResult || !aiResult.success) {
      console.error("[ANALYSIS] AI analysis failed:", aiResult?.error || "Unknown error");
      // Save what we have even if AI failed
      analysis.metaData = scrapeResult.data?.metaData || {};
      analysis.headings = {
        h1: scrapeResult.data?.headings?.h1 || [],
        h2: scrapeResult.data?.headings?.h2 || [],
        h3: scrapeResult.data?.headings?.h3 || [],
        h4: scrapeResult.data?.headings?.h4 || [],
        h5: scrapeResult.data?.headings?.h5 || [],
        h6: scrapeResult.data?.headings?.h6 || []
      };
      analysis.links = {
        internal: scrapeResult.data?.links?.internal || 0,
        external: scrapeResult.data?.links?.external || 0,
        total: scrapeResult.data?.links?.total || 0
      };
      analysis.images = {
        total: scrapeResult.data?.images?.total || 0,
        withAlt: scrapeResult.data?.images?.withAlt || 0,
        missingAlt: scrapeResult.data?.images?.missingAlt || 0,
        list: scrapeResult.data?.images?.list || []
      };
      analysis.loadTime = scrapeResult.data?.loadTime || 0;
      analysis.pageSize = scrapeResult.data?.pageSize || 0;
      analysis.wordCount = scrapeResult.data?.wordCount || 0;
      analysis.status = "failed";
      analysis.issues = [{
        severity: "critical",
        category: "technical",
        message: "AI analysis failed: " + (aiResult?.error || "Unknown error"),
        recommendation: "Please try again or check the API configuration."
      }];
      await analysis.save();
      return;
    }

    console.log("[ANALYSIS] AI analysis successful, saving results...");

    // Step 3: Save results with proper structure
    analysis.overallScore = aiResult.data?.overallScore || 0;
    analysis.categories = aiResult.data?.categories || {};
    
    // ✅ Save metaData with all fields
    analysis.metaData = {
      title: scrapeResult.data?.metaData?.title || "",
      description: scrapeResult.data?.metaData?.description || "",
      keywords: scrapeResult.data?.metaData?.keywords || "",
      robots: scrapeResult.data?.metaData?.robots || "",
      canonical: scrapeResult.data?.metaData?.canonical || "",
      ogTitle: scrapeResult.data?.metaData?.ogTitle || "",
      ogDescription: scrapeResult.data?.metaData?.ogDescription || "",
      ogImage: scrapeResult.data?.metaData?.ogImage || "",
      twitterCard: scrapeResult.data?.metaData?.twitterCard || "",
      viewport: scrapeResult.data?.metaData?.viewport || "",
      charset: scrapeResult.data?.metaData?.charset || ""
    };
    
    // ✅ Save headings as arrays of strings
    analysis.headings = {
      h1: Array.isArray(scrapeResult.data?.headings?.h1) ? scrapeResult.data.headings.h1 : [],
      h2: Array.isArray(scrapeResult.data?.headings?.h2) ? scrapeResult.data.headings.h2 : [],
      h3: Array.isArray(scrapeResult.data?.headings?.h3) ? scrapeResult.data.headings.h3 : [],
      h4: Array.isArray(scrapeResult.data?.headings?.h4) ? scrapeResult.data.headings.h4 : [],
      h5: Array.isArray(scrapeResult.data?.headings?.h5) ? scrapeResult.data.headings.h5 : [],
      h6: Array.isArray(scrapeResult.data?.headings?.h6) ? scrapeResult.data.headings.h6 : []
    };
    
    // ✅ Save links as numbers
    analysis.links = {
      internal: typeof scrapeResult.data?.links?.internal === 'number' ? scrapeResult.data.links.internal : 0,
      external: typeof scrapeResult.data?.links?.external === 'number' ? scrapeResult.data.links.external : 0,
      total: typeof scrapeResult.data?.links?.total === 'number' ? scrapeResult.data.links.total : 0
    };
    
    // ✅ Save images with proper structure
    analysis.images = {
      total: typeof scrapeResult.data?.images?.total === 'number' ? scrapeResult.data.images.total : 0,
      withAlt: typeof scrapeResult.data?.images?.withAlt === 'number' ? scrapeResult.data.images.withAlt : 0,
      missingAlt: typeof scrapeResult.data?.images?.missingAlt === 'number' ? scrapeResult.data.images.missingAlt : 0,
      list: Array.isArray(scrapeResult.data?.images?.list) ? scrapeResult.data.images.list : []
    };
    
    // ✅ Save AI results
    analysis.keywords = Array.isArray(aiResult.data?.keywords) ? aiResult.data.keywords : [];
    analysis.issues = Array.isArray(aiResult.data?.issues) ? aiResult.data.issues : [];
    
    // ✅ Save performance metrics
    analysis.loadTime = typeof scrapeResult.data?.loadTime === 'number' ? scrapeResult.data.loadTime : 0;
    analysis.pageSize = typeof scrapeResult.data?.pageSize === 'number' ? scrapeResult.data.pageSize : 0;
    analysis.wordCount = typeof scrapeResult.data?.wordCount === 'number' ? scrapeResult.data.wordCount : 0;
    
    analysis.status = "completed";

    await analysis.save();
    console.log(`[ANALYSIS] Analysis completed for: ${url}`);

  } catch (bgError) {
    console.error("[ANALYSIS] Background processing error:", bgError.message);
    console.error("[ANALYSIS] Stack trace:", bgError.stack);
    try {
      analysis.status = "failed";
      analysis.issues = [{
        severity: "critical",
        category: "technical",
        message: "Analysis failed: " + bgError.message,
        recommendation: "Please try again later."
      }];
      await analysis.save();
    } catch (saveError) {
      console.error("[ANALYSIS] Failed to save failed status:", saveError.message);
    }
  }
}

// Get analysis by ID
export const getAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!analysis) {
      return res.status(404).json({ success: false, message: "Analysis not found" });
    }

    res.json({ success: true, analysis });

  } catch (error) {
    console.error("[ANALYSIS] Get analysis error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all analyses for user
export const getAnalyses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const analyses = await Analysis.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-issues -keywords");

    const total = await Analysis.countDocuments({ userId: req.userId });

    res.json({
      success: true,
      analyses,
      pagination: { 
        page, 
        limit, 
        total, 
        pages: Math.ceil(total / limit) 
      },
    });

  } catch (error) {
    console.error("[ANALYSIS] Get analyses error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete analysis
export const deleteAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!analysis) {
      return res.status(404).json({ success: false, message: "Analysis not found" });
    }

    res.json({ success: true, message: "Analysis deleted" });

  } catch (error) {
    console.error("[ANALYSIS] Delete analysis error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};