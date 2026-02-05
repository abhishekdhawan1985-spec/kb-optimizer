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
        content: `You are a KB article optimizer for Amazon Q. Keep article compact (±20% length).

CRITICAL RULES:
- ONLY use information from the original article
- DO NOT add details not in the source
- Reorganize and clarify existing content
- Use question-format title
- Add clear structure with headings
- Make text more specific and actionable
- Remove redundancy

FORMAT YOUR RESPONSE WITH PROPER SPACING:
- Use ## for main headers
- Use ### for subheaders
- Separate paragraphs with blank lines
- Use numbered lists for steps
- Use bullet points for items

Optimize this article:

${article}

Provide:
1. Optimized article with proper formatting
2. After "---ANALYSIS---", provide word counts and scores (1-10)`
      }]
    });

    const fullResponse = message.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    const parts = fullResponse.split('---ANALYSIS---');
    let optimizedArticle = parts[0].trim();
    const analysis = parts[1] ? parts[1].trim() : 'Analysis not available';

    // Convert markdown to HTML with proper formatting
    // Convert headers (before other formatting)
    optimizedArticle = optimizedArticle.replace(/^### (.+)$/gm, '<h3 style="margin: 20px 0 10px 0; color: #232F3E; font-size: 18px;">$1</h3>');
    optimizedArticle = optimizedArticle.replace(/^## (.+)$/gm, '<h2 style="margin: 25px 0 15px 0; color: #232F3E; font-size: 22px; font-weight: 600;">$1</h2>');
    optimizedArticle = optimizedArticle.replace(/^# (.+)$/gm, '<h1 style="margin: 30px 0 20px 0; color: #232F3E; font-size: 26px; font-weight: 700;">$1</h1>');
    
    // Convert bold text
    optimizedArticle = optimizedArticle.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic text  
    optimizedArticle = optimizedArticle.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convert double line breaks to paragraph breaks
    optimizedArticle = optimizedArticle.split('\n\n').map(para => {
      if (para.trim().startsWith('<h')) {
        return para; // Don't wrap headers in <p>
      }
      return '<p style="margin: 10px 0; line-height: 1.6;">' + para.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    
    // Clean up
    optimizedArticle = optimizedArticle.replace(/<p[^>]*><\/p>/g, ''); // Remove empty paragraphs
    optimizedArticle = optimizedArticle.replace(/<p[^>]*>\s*<br>\s*<\/p>/g, ''); // Remove paragraphs with only <br>

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
