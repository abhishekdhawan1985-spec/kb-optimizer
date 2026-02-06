const Anthropic = require('@anthropic-ai/sdk');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { article, mode, userEdits } = req.body;
    
    // Validate input
    if (!article || article.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide an article to optimize' });
    }

    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      return res.status(500).json({ 
        error: 'API key not configured',
        details: 'Please set ANTHROPIC_API_KEY in Vercel environment variables and redeploy'
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // ========================================================================
    // MODE 1: OPTIMIZE & VALIDATE (Initial Pass)
    // ========================================================================
    
    if (!mode || mode === 'optimize') {
      console.log('Starting optimization + validation...');

      // Step 1: Optimize with EXPLICIT Amazon Q rules from AWS blog
      const optimizationPrompt = `You are a KB article optimizer for Amazon Q in Connect. Keep article compact (±20% length).

🎯 PRIMARY OBJECTIVE:
Transform this KB article using the 15 optimization techniques from AWS's Amazon Q best practices, while maintaining ±20% original length.

⚠️ CRITICAL ANTI-HALLUCINATION RULES - NEVER VIOLATE:
- ONLY use information explicitly stated in the original article
- DO NOT add details, examples, statistics, specifications, or facts not in the source
- DO NOT assume, infer, or fabricate any information
- If the original lacks detail, keep it brief - don't make things up
- Every fact must be traceable to the original article

📋 APPLY THESE 15 AMAZON Q OPTIMIZATION TECHNIQUES:

1. QUESTION-FOCUSED TITLE
   - Convert title to customer question format
   - Example: "Camera Offline" → "Why Is My Camera Showing Offline in the App?"
   - Must match how customers search

2. FRONT-LOAD KEY INFORMATION
   - Start with 2-3 sentence problem description
   - State what issue this solves upfront
   - Help Amazon Q quickly identify relevance

3. CLEAR HIERARCHICAL STRUCTURE
   - Use ## for main sections
   - Use ### for subsections
   - Logical flow: Problem → Quick Checks → Steps → Resolution

4. SPECIFIC, ACTIONABLE LANGUAGE
   - Replace vague terms with specific instructions
   - "Check settings" → "Open app > Settings > Recording > verify enabled"
   - No ambiguous language

5. ACTIVE VOICE & COMMANDS
   - Use imperative verbs
   - "You should check" → "Check..."
   - Direct instructions, not suggestions

6. NO HEDGING LANGUAGE
   - Remove: "might", "could", "possibly", "try", "maybe"
   - "This might help" → "This resolves the issue"
   - Confident, definitive statements (when info is in original)

7. DEFINE TECHNICAL TERMS
   - First use of technical terms: add brief explanation
   - Only if term exists in original

8. QUICK CHECKS SECTION (if applicable)
   - 3-4 rapid validation steps
   - Each takes ~30 seconds
   - Label as "Quick Checks (30 seconds each)"

9. EXPECTED RESULTS
   - After each step, state what should happen
   - "Expected: Camera shows 'Online' status"
   - Helps users validate success

10. TIME ESTIMATES
    - Generic estimates only (don't fabricate specific times)
    - "This takes a few minutes" is OK
    - "This takes exactly 3 minutes 27 seconds" is NOT OK

11. SUCCESS VALIDATION CRITERIA
    - Clear "how to know it worked" statement
    - End with validation step

12. COMMON SCENARIO SHORTCUTS
    - If original mentions scenarios, organize them
    - Don't invent new scenarios

13. REMOVE REDUNDANCY
    - Consolidate repeated information
    - One clear statement per fact

14. CONCISE NAVIGATION PATHS
    - Specific menu paths when in original
    - Settings > Device > Camera (not "go to settings area")

15. MAINTAIN COMPACT LENGTH
    - Target ±20% of original word count
    - More concise, not more verbose

FORMAT YOUR RESPONSE:
- Use ## for main headers (h2)
- Use ### for subheaders (h3)
- Separate paragraphs with blank lines
- Use numbered lists for sequential steps
- Use bullet points for non-sequential items

After the article, add:
---ANALYSIS---
Original word count: [X]
Optimized word count: [Y]
Change: [Z]%
Structure score (1-10): [score]
Clarity score (1-10): [score]
Actionability score (1-10): [score]
Overall Amazon Q optimization score (1-10): [score]

Now optimize this article:
${article}`;

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
❌ New statistics or numbers not in original (e.g., "below 15%" when original says "low")
❌ Added product features, specifications, or model names not mentioned
❌ New troubleshooting steps or solutions not in original
❌ Made-up error codes, technical details, or requirements
❌ Fabricated specific timelines (e.g., "30 seconds" when original says "brief")
❌ Assumed causes not mentioned (e.g., "2.4GHz WiFi" when original says "WiFi")
❌ New examples with specific details not in source

WHAT DOES NOT COUNT AS HALLUCINATION:
✅ Reorganized structure (headers, sections, reordering)
✅ Clearer phrasing of existing information
✅ Generic language ("a few minutes", "briefly", "quickly")
✅ Standard troubleshooting verbs ("restart", "check", "verify")
✅ Formatting improvements (bold, lists, spacing)
✅ Question-format title derived from original title
✅ Adding section headers for organization

FORMAT YOUR RESPONSE EXACTLY AS SHOWN:

## ✅ FACTUAL ACCURACY
[Brief assessment - 1-2 sentences about overall accuracy]

## 🚨 POTENTIAL HALLUCINATIONS
[List each potential hallucination as a bullet point with location and reason]
Format: "In [location], article adds '[specific text]' but original [what original actually says]"

Examples:
- "In Quick Checks section, article specifies 'battery level below 15%' but original only mentions 'low battery'"
- "In WiFi requirements, article states '2.4GHz network' but original just says 'WiFi connection'"
- "In Step 3, article mentions 'hold reset button for 30 seconds' but original says 'hold briefly'"

If NONE detected, write: "None detected - all facts traced to original article"

## 📊 HALLUCINATION SCORE
Score: [X]/10
(0 = zero issues, 10 = many fabricated facts)

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
        optimizedArticle: optimizedArticle,
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
        instructions += `\n❌ REMOVE these items (user confirmed they are hallucinations):\n`;
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
2. Removing the items marked for removal completely
3. Updating items with user's edited text exactly as provided
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
