import {GoogleGenAI,Type} from '@google/genai';
const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
// Response schema for structured SEO analysis
const seoAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: { type: Type.INTEGER },
        categories: {
            type: Type.OBJECT,
            properties: {
                seo: { type: Type.INTEGER },
                performance: { type: Type.INTEGER },
                accessibility: { type: Type.INTEGER },
                bestPractices: { type: Type.INTEGER },
            },
            required: ["seo", "performance", "accessibility", "bestPractices"],
        },
        keywords: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    count: { type: Type.INTEGER },
                    density: { type: Type.NUMBER },
                },
                required: ["word", "count", "density"],
            },
        },
        issues: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    severity: {
                        type: Type.STRING,
                        format: "enum",
                        enum: ["critical", "warning", "info"],
                    },

                    category: { type: Type.STRING },
                    message: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                },
                required: ["severity", "category", "message", "recommendation"],
            },
        },
    },
    required: ["overallScore", "categories", "keywords", "issues"],
};
export async function analyseSeoData(scrappedData) {
    try {
        // ✅ FIXED: Changed all 'scrapedData' to 'scrappedData' to match the parameter name
        const prompt = `You are an expert SEO analyst. Analyze the following website data and provide a comprehensive SEO audit.

Website URL: ${scrappedData.url}
Load Time: ${scrappedData.loadTime}ms
Status Code: ${scrappedData.statusCode}
Page Size: ${Math.round(scrappedData.pageSize / 1024)}KB
Word Count: ${scrappedData.wordCount}

META DATA:
- Title: "${scrappedData.metaData.title}" (${scrappedData.metaData.title.length} chars)
- Description: "${scrappedData.metaData.description}" (${scrappedData.metaData.description.length} chars)
- Canonical: "${scrappedData.metaData.canonical}"
- Robots: "${scrappedData.metaData.robots}"
- OG Title: "${scrappedData.metaData.ogTitle}"
- OG Description: "${scrappedData.metaData.ogDescription}"
- OG Image: "${scrappedData.metaData.ogImage}"
- Twitter Card: "${scrappedData.metaData.twitterCard}"
- Viewport: "${scrappedData.metaData.viewport}"
- Charset: "${scrappedData.metaData.charset}"

HEADINGS:
- H1: ${scrappedData.headings.h1} (texts: ${JSON.stringify(scrappedData.headings.h1Texts)})
- H2: ${scrappedData.headings.h2}
- H3: ${scrappedData.headings.h3}
- H4: ${scrappedData.headings.h4}
- H5: ${scrappedData.headings.h5}
- H6: ${scrappedData.headings.h6}

LINKS:
- Internal: ${scrappedData.links.internal}
- External: ${scrappedData.links.external}
- Total: ${scrappedData.links.total}

IMAGES:
- Total: ${scrappedData.images.total}
- Missing Alt Text: ${scrappedData.images.missingAlt}
- With Alt Text: ${scrappedData.images.withAlt}

PAGE CONTENT (first 3000 chars):
${scrappedData.bodyText}

Scoring guidelines:
- Title: 50-60 chars optimal, must exist
- Description: 150-160 chars optimal, must exist
- H1: exactly 1 is ideal
- Images: all should have alt text
- Load time: <3s good, <5s ok, >5s poor
- Page size: <3MB good
- Must have viewport meta, charset, canonical
- OG tags and Twitter cards are important
- Internal linking is good for SEO
- Word count: >300 words for content pages
- Check heading hierarchy

Severity levels must be exactly one of: "critical", "warning", or "info".
Provide 5-15 issues sorted by severity (critical first). Be specific and actionable with recommendations.
Extract top 10 keywords by frequency from the page content.`;
     const response = await ai.models.generateContent({
  model: 'gemma-4-31b-it',
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  config: {
    responseMimeType: "application/json",
    responseSchema: seoAnalysisSchema,
  }
})

const analysis = JSON.parse(response.text)

return { success: true, data: analysis }
    } catch (error) {
        console.error("gemini analysis error:",error.message);
        return {success:false ,error:error.message};
    }
}