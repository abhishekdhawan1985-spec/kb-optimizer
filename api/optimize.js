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
    
    if (!article || article.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide an article to optimize' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API key not configured',
        details: 'Please set ANTHROPIC_API_KEY in Vercel environment variables'
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // MODE 1: OPTIMIZE & VALIDATE
    if (!mode || mode === 'optimize') {
      console.log('Starting optimization with AWS rules...');

      // OPTIMIZED: All 15 AWS rules in concise format
      const optimizationPrompt = `KB Article Optimizer for Amazon Q. Target: similar length (plus or minus 20%).

CRITICAL: Only use information from the original article. Never add facts, numbers, or details not present in the source.

Apply these 15 Amazon Q optimization techniques:

1. Question-format title (e.g., "Issue" becomes "Why Is Issue Happening?")
2. Front-load 2-3 sentence problem description at start
3. Clear structure: Use ## for sections, ### for subsections
4. Specific instructions: "Check settings" becomes "Open app, tap Settings, tap Recording"
5. Active voice commands: "Check" not "You should check"
6. No hedging: Remove "might", "could", "possibly", "try"
7. Define technical terms on first use (only if in original)
8. Quick Checks section: 3-4 rapid 30-second validation steps (if applicable)
9. Expected results: State what should happen after each step
10. Time estimates: Generic only ("a few minutes"), no specific times unless in original
11. Success criteria: Clear "how to know it worked" at end
12. Organize scenarios if mentioned in original
13. Remove redundancy: One clear statement per fact
14. Concise paths: "Settings > Device > Camera" not "go to settings"
15. Maintain compact length: plus or minus 20% of original

Format with ## headers, ### subheaders, paragraphs separated by blank lines.

Optimize this article:
${article}

After article add:
---ANALYSIS---
Original words: [X]
Optimized words: [Y]
Change: [Z]%
Amazon Q score: [1-10]`;

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

      // Convert markdown to HTML
      optimizedArticle = optimizedArticle.replace(/^### (.+)$/gm, '<h3 style="margin: 20px 0 10px 0; color: #232F3E; font-size: 18px;">$1</h3>');
      optimizedArticle = optimizedArticle.replace(/^## (.+)$/gm, '<h2 style="margin: 25px 0 15px 0; color: #232F3E; font-size: 22px; font-weight: 600;">$1</h2>');
      optimizedArticle = optimizedArticle.replace(/^# (.+)$/gm, '<h1 style="margin: 30px 0 20px 0; color: #232F3E; font-size: 26px; font-weight: 700;">$1</h1>');
      optimizedArticle = optimizedArticle.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      optimizedArticle = optimizedArticle.replace(/\*(.+?)\*/g, '<em>$1</em>');
      
      optimizedArticle = optimizedArticle.split('\n\n').map(para => {
        if (para.trim().startsWith('<h')) return para;
        return '<p style="margin: 10px 0; line-height: 1.6;">' + para.replace(/\n/g, '<br>') + '</p>';
      }).join('\n');
      
      optimizedArticle = optimizedArticle.replace(/<p[^>]*><\/p>/g, '');
      optimizedArticle = optimizedArticle.replace(/<p[^>]*>\s*<br>\s*<\/p>/g, '');

      // Validate for hallucinations
      console.log('Validating for hallucinations...');
      
      const validationPrompt = `Compare ORIGINAL vs OPTIMIZED. List any NEW facts in optimized that are NOT in original.

WHAT COUNTS AS HALLUCINATION:
- New statistics or numbers (e.g., "15%" when original says "low")
- Added product features or specs not mentioned
- New troubleshooting steps not in original
- Made-up error codes or technical details
- Specific timelines not in original (e.g., "30 seconds" when original says "briefly")
- Assumed causes (e.g., "2.4GHz" when original says "WiFi")

WHAT DOES NOT COUNT:
- Reorganized structure, clearer phrasing, generic language, formatting
- Question-format title, section headers, expected results from existing steps
- Generic time estimates like "a few minutes" (when reasonable)

Format:
## FACTUAL ACCURACY
[1-2 sentences]

## POTENTIAL HALLUCINATIONS
- [List each with location]
Or: "None detected"

## HALLUCINATION SCORE
Score: [0-10]

## RECOMMENDATION
[APPROVE / REVIEW NEEDED / REJECT]

---
ORIGINAL:
${article}

OPTIMIZED:
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

      const scoreMatch = validationReport.match(/Score:\s*(\d+)/i);
      const hallucinationScore = scoreMatch ? parseInt(scoreMatch[1]) : 5;
      
      const recommendationMatch = validationReport.match(/RECOMMENDATION[:\s\n]+(APPROVE|REVIEW NEEDED|REJECT)/i);
      const recommendation = recommendationMatch ? recommendationMatch[1] : 'REVIEW NEEDED';
      
      const hallucinationsSection = validationReport.split('POTENTIAL HALLUCINATIONS')[1]?.split('##')[0] || '';
      const hallucinations = hallucinationsSection
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().replace(/^[-]\s*/, ''));
      
      const hasHallucinations = !hallucinationsSection.toLowerCase().includes('none detected') && hallucinations.length > 0;

      console.log(`Complete. Score: ${hallucinationScore}, Hallucinations: ${hallucinations.length}`);

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

    // MODE 2: FINALIZE
    if (mode === 'finalize') {
      if (!userEdits) {
        return res.status(400).json({ error: 'Missing userEdits for finalize mode' });
      }

      const { originalArticle, optimizedArticle, keptIssues, removedIssues } = userEdits;
      
      if (!originalArticle || !optimizedArticle) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      console.log('Generating final article...');

      let instructions = `Edit this KB article based on user feedback.

OPTIMIZED ARTICLE:
${optimizedArticle}

USER FEEDBACK:
`;

      if (removedIssues && removedIssues.length > 0) {
        instructions += `\nREMOVE these items:\n`;
        removedIssues.forEach(issue => {
          instructions += `- "${issue.text}"\n`;
        });
      }

      if (keptIssues && keptIssues.length > 0) {
        const editedIssues = keptIssues.filter(issue => issue.editedText !== issue.text || issue.status === 'edited');
        if (editedIssues.length > 0) {
          instructions += `\nUPDATE these items:\n`;
          editedIssues.forEach(issue => {
            instructions += `- Replace "${issue.text}" with "${issue.editedText}"\n`;
          });
        }
      }

      instructions += `\nGenerate final article by:
1. Removing marked items completely
2. Updating items with edited text exactly as provided
3. Keeping everything else unchanged
4. Maintaining exact HTML formatting

Return ONLY the HTML, no markdown blocks, no explanatory text.`;

      const finalResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: instructions
        }]
      });

      let finalArticle = finalResponse.content[0].text;
      
      // Strip markdown wrappers if present
      finalArticle = finalArticle.replace(/^```html\n?/i, '').replace(/\n?```$/i, '');
      finalArticle = finalArticle.trim();

      console.log('Final article complete');

      return res.status(200).json({
        success: true,
        finalArticle
      });
    }

    return res.status(400).json({ error: 'Invalid mode. Use "optimize" or "finalize"' });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to optimize article',
      message: error.message 
    });
  }
}
