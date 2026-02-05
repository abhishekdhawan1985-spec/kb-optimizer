const Anthropic = require('@anthropic-ai/sdk');

export default async function handler(req, res) {
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
    const { article, mode, userEdits } = req.body;
    
    if (!article || article.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide an article to optimize' });
    }

    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured. Please set ANTHROPIC_API_KEY in Vercel environment variables.' });
    }

    const anthropic = new Anthropic({ apiKey });

    // ========================================================================
    // MODE 1: OPTIMIZE & VALIDATE (Initial Pass)
    // ========================================================================
    
    if (!mode || mode === 'optimize') {
      console.log('Starting optimization + validation...');

      // Step 1: Optimize with anti-hallucination rules
      const optimizationPrompt = `You are a KB article optimizer for Amazon Q. Keep article compact (±20% length).

CRITICAL RULES - NEVER VIOLATE:
- ONLY use information explicitly stated in the original article
- DO NOT add details, examples, statistics, or specifications not in the source
- DO NOT assume or infer information
- Reorganize and clarify existing content ONLY
- If the original lacks detail, keep it brief - don't fabricate
- Use question-format title
- Add clear structure with headings
- Make text more specific and actionable (but only from existing info)
- Remove redundancy

FORMAT YOUR RESPONSE WITH PROPER SPACING:
- Use ## for main headers
- Use ### for subheaders
- Separate paragraphs with blank lines
- Use numbered lists for steps
- Use bullet points for items

IMPORTANT: Every fact in the optimized article must be traceable to the original article. Do not add product names, model numbers, technical specifications, timelines, or any other details not explicitly stated in the original.

Optimize this article:
${article}

Provide:
1. Optimized article with proper formatting
2. After "---ANALYSIS---", provide word counts and scores (1-10)`;

      const optimizationResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: optimizationPrompt
        }]
      });

      const fullResponse = optimizationResponse.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      const parts = fullResponse.split('---ANALYSIS---');
      let optimizedArticle = parts[0].trim();
      const analysis = parts[1] ? parts[1].trim() : 'Analysis not available';

      // Convert markdown to HTML with proper formatting
      optimizedArticle = optimizedArticle.replace(/^### (.+)$/gm, '<h3 style="margin: 20px 0 10px 0; color: #232F3E; font-size: 18px;">$1</h3>');
      optimizedArticle = optimizedArticle.replace(/^## (.+)$/gm, '<h2 style="margin: 25px 0 15px 0; color: #232F3E; font-size: 22px; font-weight: 600;">$1</h2>');
      optimizedArticle = optimizedArticle.replace(/^# (.+)$/gm, '<h1 style="margin: 30px 0 20px 0; color: #232F3E; font-size: 26px; font-weight: 700;">$1</h1>');
      optimizedArticle = optimizedArticle.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      optimizedArticle = optimizedArticle.replace(/\*(.+?)\*/g, '<em>$1</em>');
      
      optimizedArticle = optimizedArticle.split('\n\n').map(para => {
        if (para.trim().startsWith('<h')) {
          return para;
        }
        return '<p style="margin: 10px 0; line-height: 1.6;">' + para.replace(/\n/g, '<br>') + '</p>';
      }).join('\n');
      
      optimizedArticle = optimizedArticle.replace(/<p[^>]*><\/p>/g, '');
      optimizedArticle = optimizedArticle.replace(/<p[^>]*>\s*<br>\s*<\/p>/g, '');

      // Step 2: Validate for hallucinations
      console.log('Validating for hallucinations...');
      
      const validationPrompt = `You are a fact-checker. Compare the ORIGINAL article with the OPTIMIZED article.

🎯 YOUR TASK:
Identify any FACTUAL information in the OPTIMIZED article that is NOT present in the ORIGINAL article.

WHAT COUNTS AS HALLUCINATION:
❌ New statistics or numbers not in original
❌ Added product features, specifications, or model names
❌ New troubleshooting steps or solutions
❌ Made-up error codes or technical details
❌ Fabricated timelines or durations (unless generic like "a few minutes")
❌ Assumed causes not mentioned in original
❌ New examples with specific details

WHAT DOES NOT COUNT AS HALLUCINATION:
✅ Reorganized structure (headers, sections)
✅ Clearer phrasing of existing information
✅ Generic time estimates without specific numbers
✅ Standard troubleshooting language ("restart", "check connection")
✅ Formatting improvements

FORMAT YOUR RESPONSE EXACTLY AS SHOWN:

## ✅ FACTUAL ACCURACY
[Brief assessment - 1-2 sentences]

## 🚨 POTENTIAL HALLUCINATIONS
[List each potential hallucination as a bullet point with location]
- "In Step 3, article adds '2.4GHz WiFi' but original doesn't specify frequency"
- "Quick Checks section mentions 'battery level below 15%' but original says 'low battery'"

If NONE detected, write: "None detected - all facts traced to original article"

## 📊 HALLUCINATION SCORE
Score: [X]/10

## 🔍 RECOMMENDATION
[Choose ONE: APPROVE / REVIEW NEEDED / REJECT]

---
ORIGINAL ARTICLE:
${article}

---
OPTIMIZED ARTICLE:
${optimizedArticle}`;

      const validationResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: validationPrompt
        }]
      });

      const validationReport = validationResponse.content[0].text;

      // Parse validation results
      const scoreMatch = validationReport.match(/Score:\s*(\d+)\/10/i);
      const hallucinationScore = scoreMatch ? parseInt(scoreMatch[1]) : 5;
      
      const recommendationMatch = validationReport.match(/RECOMMENDATION[:\s\n]+(APPROVE|REVIEW NEEDED|REJECT)/i);
      const recommendation = recommendationMatch ? recommendationMatch[1] : 'REVIEW NEEDED';
      
      // Extract hallucinations list
      const hallucinationsSection = validationReport.split('🚨 POTENTIAL HALLUCINATIONS')[1]?.split('##')[0] || '';
      const hallucinations = hallucinationsSection
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.trim().replace(/^[-•]\s*/, ''));
      
      const hasHallucinations = !hallucinationsSection.toLowerCase().includes('none detected') && hallucinations.length > 0;

      console.log(`Validation complete. Score: ${hallucinationScore}, Hallucinations found: ${hallucinations.length}`);

      return res.status(200).json({
        success: true,
        optimizedArticle: optimizedArticle,  // Changed from optimizedContent to optimizedArticle
        analysis,
        validation: {
          score: hallucinationScore,
          recommendation,
          hallucinations: hasHallucinations ? hallucinations : [],
          fullReport: validationReport
        }
      });
    }

    // ========================================================================
    // MODE 2: GENERATE FINAL (With User Edits)
    // ========================================================================
    
    if (mode === 'finalize') {
      if (!userEdits) {
        return res.status(400).json({ error: 'Missing userEdits for finalize mode' });
      }

      const { originalArticle, optimizedArticle, keptIssues, removedIssues } = userEdits;

      console.log('Generating final article with user edits...');

      let instructions = `You are editing a KB article based on user feedback about potential hallucinations.

ORIGINAL ARTICLE:
${originalArticle}

OPTIMIZED ARTICLE (with potential issues):
${optimizedArticle}

USER FEEDBACK:
`;

      if (removedIssues && removedIssues.length > 0) {
        instructions += `\n❌ REMOVE these items (they are hallucinations):\n`;
        removedIssues.forEach(issue => {
          instructions += `- "${issue.text}"\n`;
        });
      }

      if (keptIssues && keptIssues.length > 0) {
        const editedIssues = keptIssues.filter(issue => issue.editedText !== issue.text || issue.status === 'edited');
        if (editedIssues.length > 0) {
          instructions += `\n✏️ UPDATE these items with user's edited versions:\n`;
          editedIssues.forEach(issue => {
            instructions += `- Original: "${issue.text}"\n`;
            instructions += `- Change to: "${issue.editedText}"\n\n`;
          });
        }
      }

      instructions += `\nTASK: Generate the final KB article by:
1. Starting with the optimized version
2. Removing the items marked for removal
3. Updating items with user's edited text
4. Keeping everything else as-is
5. Maintaining the same HTML formatting and structure

Return ONLY the final article HTML, nothing else.`;

      const finalResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: instructions
        }]
      });

      const finalArticle = finalResponse.content[0].text;

      console.log('Final article generated successfully');

      return res.status(200).json({
        success: true,
        finalArticle
      });
    }

    // Invalid mode
    return res.status(400).json({ error: 'Invalid mode. Use "optimize" or "finalize"' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to optimize article',
      message: error.message 
    });
  }
}
