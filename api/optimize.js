// api/optimize.js - Vercel Serverless Function with NO HALLUCINATION
// Place this file in: api/optimize.js

const Anthropic = require('@anthropic-ai/sdk');

// Function to convert Markdown to HTML
function convertMarkdownToHTML(text) {
  let html = text;
  
  // Convert headers (## Header) to bold HTML
  html = html.replace(/^### (.*?)$/gm, '<strong>$1</strong>');
  html = html.replace(/^## (.*?)$/gm, '<strong>$1</strong>');
  html = html.replace(/^# (.*?)$/gm, '<strong>$1</strong>');
  
  // Convert bold (**text** or __text__) to HTML <strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Convert italic (*text* or _text_) to HTML <em>
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Convert line breaks to <br>
  html = html.replace(/\n/g, '<br>');
  
  // Clean up multiple <br> tags
  html = html.replace(/(<br>){3,}/g, '<br><br>');
  
  return html;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { article } = req.body;

    if (!article || article.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide an article to optimize' });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `You are a world-class expert at optimizing knowledge base articles for Amazon Q in Connect.

**CRITICAL RULES - NEVER VIOLATE:**

🚫 **ABSOLUTE NO HALLUCINATION RULE:**
- ONLY use information that EXISTS in the original article
- NEVER add technical details not present in the source
- NEVER add steps, procedures, or troubleshooting advice not in the original
- NEVER add product names, features, or capabilities not mentioned
- NEVER add numbers, percentages, or specifications not in the source
- NEVER add links or references not in the original
- If the original lacks detail, keep it vague - DO NOT invent specifics
- When in doubt, use the EXACT wording from the original

✅ **WHAT YOU CAN DO:**
- Reorganize existing information for better structure
- Reword existing content for clarity (using original facts only)
- Add formatting (headings, bullets, numbering)
- Improve grammar and flow
- Make question-format title from existing content
- Add section headers to organize existing information

❌ **WHAT YOU CANNOT DO:**
- Add "Quick Checks" if steps aren't already in the article
- Add time estimates if they're not mentioned
- Add specific battery percentages if not in original
- Add troubleshooting steps not present
- Add expected results if not stated in original
- Invent technical specifications
- Add URLs or links not in the source

---

**OPTIMIZATION APPROACH:**

**TIER 1: STRUCTURE (Safe - No New Info)**
1. **Question-Format Title** - Convert existing title to "Why/How/What..." format
2. **Clear Hierarchy** - Add H2/H3 headings to organize existing sections
3. **Better Formatting** - Convert to numbered steps, bullet points

**TIER 2: LANGUAGE IMPROVEMENT (Safe - Same Facts)**
4. **Active Voice** - Rewrite passive sentences using same information
5. **Imperative Commands** - Change "you should" to direct commands
6. **Remove Hedging** - Cut unnecessary qualifiers while keeping facts accurate
7. **Define Acronyms** - If acronym exists in source, add (definition) inline

**TIER 3: MINIMAL ADDITIONS (Only if Source Supports)**
8. **Quick Checks Section** - ONLY if article already contains these steps
9. **Time Estimates** - ONLY if article mentions time or you can reasonably infer from "wait" or "restart"
10. **Expected Results** - ONLY if article already describes outcomes
11. **Group Related Content** - Organize existing information into sections

**TIER 4: REDUCTIONS (Always Safe)**
12. **Remove Redundancy** - Delete repeated information
13. **Shorten Wordy Phrases** - "in order to" → "to"
14. **Remove Fluff** - Cut unnecessary introductions and conclusions

---

**VERIFICATION CHECKLIST:**

Before including ANY information, ask yourself:
- ✅ Is this fact EXPLICITLY stated in the original?
- ✅ Am I using the SAME technical details from the source?
- ✅ If I'm adding clarity, am I using ONLY the original facts?
- ❌ Am I inventing ANY steps, numbers, or procedures?
- ❌ Am I assuming ANY technical details not stated?

**When the original is vague, STAY VAGUE:**
- Original: "Check the battery" → Keep as "Check the battery" (don't add percentages)
- Original: "Restart the device" → Keep as "Restart the device" (don't add time estimates)
- Original: "Try reconnecting" → Keep as "Try reconnecting" (don't add specific steps)

**Only add specifics if they exist in the source:**
- Original: "Battery should be above 25%" → You can say "Battery must be >25%"
- Original: "Wait 2-3 minutes" → You can say "2-3 minutes"
- Original: "Open Settings then WiFi" → You can format as steps

---

**TARGET LENGTH:**
- Keep article COMPACT: Original ±20%
- If original is 800 words, aim for 650-950 words
- Focus on reorganizing and clarifying, not expanding

---

**OUTPUT FORMAT:**

Provide TWO parts:

**PART 1: COMPACT OPTIMIZED ARTICLE**
- Question-format title (from original title)
- Reorganized content with clear sections
- Improved formatting and clarity
- NO invented information

**PART 2: ANALYSIS** (after "---ANALYSIS---" separator)
- Original word count → Optimized word count
- Percentage change
- What was reorganized
- What was clarified
- What was removed (redundancy)
- Amazon Q scores (1-10):
  * Semantic Search Score
  * Content Clarity Score
  * Structural Organization Score
  * Overall Optimization Score (with deduction for any hallucination)
- Key improvements (3-5 bullet points)
- **Hallucination Check:** "No information added beyond source" or list any concerns

---

Now optimize this article following the NO HALLUCINATION rules:

${article}

Remember: ONLY use information from the source. When in doubt, keep it vague.

Format as:
[COMPACT OPTIMIZED ARTICLE]

---ANALYSIS---
[WORD COUNT COMPARISON AND SCORES]`
      }]
    });

    const fullResponse = message.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    const parts = fullResponse.split('---ANALYSIS---');
    let optimizedArticle = parts[0].trim();
    const analysis = parts[1] ? parts[1].trim() : 'Analysis not available';

    // Convert Markdown to HTML for better display
    optimizedArticle = convertMarkdownToHTML(optimizedArticle);

    res.status(200).json({
      success: true,
      optimizedArticle,
      analysis
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to optimize article',
      message: error.message 
    });
  }
}
