// server/services/scrapperService.js
import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";

const bb = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

export async function scrapeUrl(url) {
  let browser;
  try {
    console.log(`[SCRAPER] Starting scrape for: ${url}`);
    
    const session = await bb.sessions.create({ 
      browserSettings: { blockAds: true } 
    });
    
    browser = await chromium.connectOverCDP(session.connectUrl);
    const page = browser.contexts()[0].pages()[0];
    page.setDefaultNavigationTimeout(45000);

    await page.goto(url, { waitUntil: "networkidle" });
    
    // Add a small delay to ensure content loads
    await page.waitForTimeout(2000);

    console.log(`[SCRAPER] Page loaded, extracting data...`);

    // Scrape page data - FIXED: All variables defined inside the evaluate function
    const data = await page.evaluate(() => {
      // Helper function to get meta content
      const getMetaContent = (name) => {
        const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return meta ? meta.content : "";
      };

      // Get meta data
      const metaData = {
        title: document.querySelector('title')?.innerText || "",
        description: getMetaContent('description') || getMetaContent('og:description') || "",
        keywords: getMetaContent('keywords') || "",
        robots: getMetaContent('robots') || "",
        canonical: document.querySelector('link[rel="canonical"]')?.href || "",
        ogTitle: getMetaContent('og:title') || "",
        ogDescription: getMetaContent('og:description') || "",
        ogImage: getMetaContent('og:image') || ""
      };

      // Get headings
      const headings = {
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim()).filter(h => h),
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim()).filter(h => h),
        h3: Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim()).filter(h => h),
        h4: Array.from(document.querySelectorAll('h4')).map(h => h.innerText.trim()).filter(h => h),
        h5: Array.from(document.querySelectorAll('h5')).map(h => h.innerText.trim()).filter(h => h),
        h6: Array.from(document.querySelectorAll('h6')).map(h => h.innerText.trim()).filter(h => h)
      };

      // Get links
      const allLinks = document.querySelectorAll('a[href]');
      const internalLinks = [];
      const externalLinks = [];
      const baseUrl = window.location.origin;
      
      allLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('http')) {
          try {
            const urlObj = new URL(href);
            if (urlObj.hostname === window.location.hostname) {
              internalLinks.push(href);
            } else {
              externalLinks.push(href);
            }
          } catch (e) {
            // Invalid URL, skip
          }
        } else if (href && href.startsWith('/')) {
          // Internal relative URL
          internalLinks.push(baseUrl + href);
        }
      });

      const links = {
        internal: internalLinks,
        external: externalLinks,
        total: internalLinks.length + externalLinks.length
      };

      // Get images
      const allImages = document.querySelectorAll('img');
      const imageList = [];
      let withAlt = 0;
      let withoutAlt = 0;
      
      allImages.forEach(img => {
        const src = img.getAttribute('src');
        if (src) {
          imageList.push(src);
          if (img.getAttribute('alt') && img.getAttribute('alt').trim()) {
            withAlt++;
          } else {
            withoutAlt++;
          }
        }
      });

      const images = {
        total: imageList.length,
        withAlt: withAlt,
        withoutAlt: withoutAlt,
        list: imageList
      };

      // Get page content stats
      const content = document.body?.innerText || "";
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      // Get page size
      const pageSize = document.documentElement.outerHTML.length;

      return {
        metaData,
        headings,
        links,
        images,
        wordCount,
        loadTime: performance.now(),
        pageSize: pageSize,
        // Additional useful data
        textContent: content.substring(0, 10000), // Limit text content
        htmlVersion: document.doctype?.name || "HTML5"
      };
    });

    await browser.close();
    console.log(`[SCRAPER] Successfully scraped: ${url}`);
    
    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error("[SCRAPER] Error:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("[SCRAPER] Error closing browser:", closeError.message);
      }
    }
    return { 
      success: false, 
      error: error.message 
    };
  }
}