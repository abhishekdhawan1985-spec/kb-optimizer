// api/optimize.js - Vercel Serverless Function
// Place this file in: api/optimize.js

const Anthropic = require('@anthropic-ai/sdk');

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

**CRITICAL CONSTRAINT: Keep the article COMPACT and customer-friendly.**
- Target length: Original ±20% (if original is 800 words, aim for 650-950 words)
- Focus on QUALITY over QUANTITY
- REPLACE weak text with strong text (don't just add)
- REMOVE redundancy and fluff
- ADD only critical elements

## COMPACT OPTIMIZATION FRAMEWORK (15 Core Techniques)

### TIER 1: STRUCTURE (No Length Impact)
1. **Question-Format Title** - "Why Is My X Not Working?" instead of "X Troubleshooting"
2. **Clear Hierarchy** - Use H2/H3 headings, numbered steps, bullet points
3. **Front-Load Key Info** - Problem statement + time estimate at top

### TIER 2: PRECISION LANGUAGE (Same or Less Length)
4. **Specific vs Vague** - "Battery must be >25%" not "keep battery charged"
5. **Active Voice** - "Remove battery" not "battery should be removed"
6. **Imperative Commands** - "Check battery" not "you should check battery"
7. **Remove Hedging** - Cut "might", "possibly", "perhaps", "try to"
8. **Define Acronyms Inline** - "LED (status light)" not separate section

### TIER 3: CRITICAL ADDITIONS (Minimal +150-200 words)
9. **Quick Checks Section** - 3-5 items, 30 seconds each (60-100 words)
10. **Expected Results** - 5-10 words after each major step
11. **Time Estimates** - 2-5 words per step ("takes 2 minutes")
12. **Success Indicator** - What "fixed" looks like (30-50 words at end)
13. **Common Scenarios** - 3-5 shortcuts (80-120 words)

### TIER 4: REDUCTIONS (Cuts 100-150 words)
14. **Remove Redundancy** - Say things once, clearly
15. **Shorten Link Text** - "Related: [Title]" not "For more information, visit: [long URL description]"

## OUTPUT FORMAT

Provide TWO parts:

**PART 1: COMPACT OPTIMIZED ARTICLE**
- Question-format title
- Brief problem statement (1-2 sentences)
- Quick Checks section (60-100 words)
- Main troubleshooting steps (streamlined)
- Brief common scenarios (80-120 words)
- Success indicator (30-50 words)
- Short prevention tips (40-60 words)
- Related articles (links only, no descriptions)

**PART 2: ANALYSIS** (after "---ANALYSIS---" separator)
- Original word count → Optimized word count
- Percentage change
- What was added (and word count)
- What was removed (and word count)
- Amazon Q scores (1-10):
  * Semantic Search Score
  * Content Clarity Score
  * Customer Readiness Score
  * Overall Compact Optimization Score
- Key improvements (3-5 bullet points)

Now optimize this article following the COMPACT guidelines:

${article}

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
    const optimizedArticle = parts[0].trim();
    const analysis = parts[1] ? parts[1].trim() : 'Analysis not available';

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
