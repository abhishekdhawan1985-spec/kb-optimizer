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
  
  console.log('=== API CALLED ===');
  console.log('Request body:', JSON.stringify(req.body).substring(0, 200));
  
  try {
    const { article, mode, userEdits } = req.body;
    
    console.log('Mode:', mode);
    console.log('Article length:', article ? article.length : 0);
    
    // Validate input
    if (!article || article.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide an article to optimize' });
    }

    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found');
      return res.status(500).json({ 
        error: 'API key not configured',
        details: 'Please set ANTHROPIC_API_KEY in Vercel environment variables'
      });
    }

    console.log('API key found:', apiKey.substring(0, 10) + '...');
    
    const anthropic = new Anthropic({ apiKey });

    // MODE 1: OPTIMIZE & VALIDATE
    if (!mode || mode === 'optimize') {
      console.log('Starting optimization...');

      // SIMPLIFIED PROMPT - Testing only
      const optimizationPrompt = `You are a KB article optimizer for Amazon Q. 

Transform this article using these rules:
1. Use question-format title
2. Add clear structure with headers
3. Make content specific and actionable
4. Use active voice
5. Remove redundancy
6. Keep it compact (similar length to original)

CRITICAL: Only use information from the original article. Do not add facts.

Optimize this article:
${article}

After the article, add:
---ANALYSIS---
Word counts and scores`;

      console.log('Calling Claude API...');

      const optimizationResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: optimizationPrompt
        }]
      });

      console.log('Optimization complete');

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
      optimizedArticle = optimizedArticle.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      
      optimizedArticle = optimizedArticle.split('\n\n').map(para => {
        if (para.trim().startsWith('<h')) return para;
        return '<p style="margin: 10px 0; line-height: 1.6;">' + para.replace(/\n/g, '<br>') + '</p>';
      }).join('\n');

      console.log('Validation step...');

      // SIMPLIFIED VALIDATION
      const validationPrompt = `Compare these two articles. List any NEW facts in the optimized version that are NOT in the original.

ORIGINAL:
${article}

OPTIMIZED:
${optimizedArticle}

Format:
## POTENTIAL HALLUCINATIONS
- [List any new facts or details]
Or write: "None detected"

## HALLUCINATION SCORE
Score: [0-10]

## RECOMMENDATION
[APPROVE or REVIEW NEEDED]`;

      const validationResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: validationPrompt
        }]
      });

      const validationReport = validationResponse.content[0].text;
      console.log('Validation complete');

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

      console.log('Sending response...');

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
      console.log('Finalize mode...');
      
      if (!userEdits) {
        return res.status(400).json({ error: 'Missing userEdits for finalize mode' });
      }

      const { originalArticle, optimizedArticle, keptIssues, removedIssues } = userEdits;
      
      if (!originalArticle || !optimizedArticle) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      let instructions = `Edit this article based on user feedback.

OPTIMIZED ARTICLE:
${optimizedArticle}

`;

      if (removedIssues && removedIssues.length > 0) {
        instructions += `REMOVE these items:\n`;
        removedIssues.forEach(issue => {
          instructions += `- "${issue.text}"\n`;
        });
      }

      if (keptIssues && keptIssues.length > 0) {
        const editedIssues = keptIssues.filter(issue => issue.editedText !== issue.text);
        if (editedIssues.length > 0) {
          instructions += `\nUPDATE these:\n`;
          editedIssues.forEach(issue => {
            instructions += `- Replace "${issue.text}" with "${issue.editedText}"\n`;
          });
        }
      }

      instructions += `\nReturn only the HTML, no markdown code blocks.`;

      const finalResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: instructions }]
      });

      let finalArticle = finalResponse.content[0].text;
      finalArticle = finalArticle.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();

      console.log('Finalize complete');

      return res.status(200).json({
        success: true,
        finalArticle
      });
    }

    return res.status(400).json({ error: 'Invalid mode' });

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Failed to optimize article',
      message: error.message,
      details: error.stack ? error.stack.substring(0, 500) : 'No stack trace'
    });
  }
}
