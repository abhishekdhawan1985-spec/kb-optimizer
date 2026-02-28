const Anthropic = require('@anthropic-ai/sdk');
const { YoutubeTranscript } = require('youtube-transcript');

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (!match) {
    throw new Error('Invalid YouTube URL. Please use a format like https://www.youtube.com/watch?v=...');
  }
  return match[1];
}

async function fetchYouTubeTranscript(url) {
  const videoId = extractVideoId(url);
  let transcriptItems;
  try {
    transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('transcript') || msg.includes('disabled') || msg.includes('no captions')) {
      throw new Error('This video does not have a transcript. Try a video with captions enabled.');
    }
    throw new Error('Could not fetch video transcript: ' + err.message);
  }
  if (!transcriptItems || transcriptItems.length === 0) {
    throw new Error('This video does not have a transcript. Try a video with captions enabled.');
  }
  const transcript = transcriptItems.map(item => item.text).join(' ');
  if (transcript.trim().split(/\s+/).length < 50) {
    throw new Error('Video transcript is too short to generate a meaningful KB article.');
  }
  return transcript;
}

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
    const { article, mode, userEdits, youtubeUrl } = req.body;

    // Skip source validation for finalize mode (it uses userEdits instead)
    if (mode !== 'finalize') {
      const hasArticle = article && article.trim().length > 0;
      const hasYoutubeUrl = youtubeUrl && youtubeUrl.trim().length > 0;
      if (!hasArticle && !hasYoutubeUrl) {
        return res.status(400).json({ error: 'Please provide an article or a YouTube URL.' });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'API key not configured',
        details: 'Please set ANTHROPIC_API_KEY in Vercel environment variables'
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // Determine input mode and fetch transcript if needed
    const hasArticle = article && article.trim().length > 0;
    const hasYoutubeUrl = youtubeUrl && youtubeUrl.trim().length > 0;
    let inputMode = 'article';
    let transcriptText = '';

    if (hasYoutubeUrl && mode !== 'finalize') {
      console.log('Fetching YouTube transcript...');
      transcriptText = await fetchYouTubeTranscript(youtubeUrl);
      inputMode = hasArticle ? 'combined' : 'youtube';
    }

    // MODE 1: OPTIMIZE & VALIDATE
    if (!mode || mode === 'optimize') {
      console.log(`Starting optimization (mode: ${inputMode})...`);

      // Build source content block based on input mode
      let sourceBlock;
      let sourceWordCount;
      if (inputMode === 'youtube') {
        sourceBlock = `Generate a KB article based on this video transcript:\n${transcriptText}`;
        sourceWordCount = transcriptText.trim().split(/\s+/).length;
      } else if (inputMode === 'combined') {
        sourceBlock = `EXISTING KB ARTICLE:\n${article}\n\nYOUTUBE VIDEO TRANSCRIPT:\n${transcriptText}`;
        sourceWordCount = article.trim().split(/\s+/).length + transcriptText.trim().split(/\s+/).length;
      } else {
        sourceBlock = `Now optimize this article:\n${article}`;
        sourceWordCount = article.trim().split(/\s+/).length;
      }

      const introLine = inputMode === 'youtube'
        ? 'KB Article Generator for Amazon Q. You are creating a KB article from a YouTube video transcript. Target: concise, well-structured article.'
        : inputMode === 'combined'
          ? 'KB Article Optimizer for Amazon Q. You have BOTH an existing KB article AND a YouTube video transcript. Use both sources to produce the best possible KB article. The video may contain additional steps, context, or corrections not in the article. Target: similar length to the existing article (plus or minus 20%).'
          : 'KB Article Optimizer for Amazon Q. Target: similar length (plus or minus 20%).';

      const sourceRuleNote = inputMode === 'combined'
        ? '- Only use information from the original article AND the video transcript'
        : inputMode === 'youtube'
          ? '- Only use information from the video transcript'
          : '- Only use information from the original article';

      const optimizationPrompt = `${introLine}

CRITICAL RULES - NEVER VIOLATE:
${sourceRuleNote}
- Never add facts, numbers, or details not in the source
- Every sentence must end with a period
- Use ONLY ## for main sections and ### for subsections
- NEVER use #### (H4) headers
- Put each numbered step on its own line
- Separate all paragraphs with blank lines

Apply these 15 Amazon Q optimization techniques:

1. Question-format title: Transform title to customer question (e.g., "Camera Offline" becomes "Why Is My Camera Showing Offline?")
2. Front-load problem: Start with 2-3 sentence problem description
3. Clear structure: Use ## for main sections (Problem, Quick Checks, Resolution Steps, Success Validation). Use ### for subsections only when needed
4. Specific instructions: "Check settings" becomes "Open app, tap Settings, tap Recording, verify enabled"
5. Active voice: Use "Check" not "You should check"
6. No hedging: Remove "might", "could", "possibly"
7. Define technical terms on first use (only if in original)
8. Quick Checks section: 3-4 rapid 30-second validation steps with "Expected:" results
9. Expected results: After EVERY step, state "Expected:" outcome
10. Time estimates: Generic only ("This takes a few minutes")
11. Success Validation section: REQUIRED. Clear "Success:" statement at end showing how to verify resolution
12. Organize scenarios if in original
13. Remove redundancy
14. Concise paths: "Settings > Device > Camera"
15. Maintain compact length

FORMATTING REQUIREMENTS (CRITICAL):
- Use ## for major sections only: Problem, Quick Checks, Resolution Steps, Success Validation
- Use ### only for subsections within Resolution Steps if needed
- NEVER use ####
- Use numbered lists (1. 2. 3.) for sequential steps
- Use bullet points (- item) for non-sequential lists
- Each numbered step on separate line
- Every sentence ends with period
- Blank line between paragraphs
- Format: "Expected: [what should happen]." after each step
- Format: "Time: [estimate]." where applicable

REQUIRED SECTIONS:
1. Question-format title (##)
2. Problem description (paragraph)
3. Quick Checks section (## Quick Checks) - if applicable
4. Resolution Steps section (## Resolution Steps)
5. Success Validation section (## Success Validation) - REQUIRED at end

Example structure:
## Why Is My Camera Not Recording?

Problem: Your camera shows online but does not record video clips.

Common causes:
- Low battery or power issue
- Storage full
- Recording disabled in settings

## Quick Checks (30 seconds each)

1. Verify camera power LED is on.
   Expected: Solid or blinking LED.

2. Check app shows camera as Online.
   Expected: Status displays Online.

## Resolution Steps

### Step 1: Verify Recording Settings

Open app, tap Settings, tap Recording, verify enabled.
Expected: Recording toggle shows ON.
Time: 1 minute.

### Step 2: Check Storage

View Events tab, check available storage.
Expected: Storage shows available space.
Time: 30 seconds.

## Success Validation

Success: Camera records when motion detected and clips appear in Events within 1 minute.

${sourceBlock}

After article add:
---ANALYSIS---
Source words: [X]
Optimized words: [Y]
Change: [Z]%
Amazon Q score: [1-10]`;

      const optimizationResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20251001',
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

      // IMPROVED HTML CONVERSION
      // First, normalize line endings and clean up
      optimizedArticle = optimizedArticle.replace(/\r\n/g, '\n');
      optimizedArticle = optimizedArticle.replace(/\r/g, '\n');
      
      // Remove any H4 headers if they appear (convert to H3)
      optimizedArticle = optimizedArticle.replace(/^#### (.+)$/gm, '### $1');
      
      // Convert headers in correct order (most specific first)
      optimizedArticle = optimizedArticle.replace(/^### (.+)$/gm, '<h3 style="margin: 20px 0 10px 0; color: #232F3E; font-size: 18px; font-weight: 600;">$1</h3>');
      optimizedArticle = optimizedArticle.replace(/^## (.+)$/gm, '<h2 style="margin: 25px 0 15px 0; color: #232F3E; font-size: 22px; font-weight: 700;">$1</h2>');
      optimizedArticle = optimizedArticle.replace(/^# (.+)$/gm, '<h1 style="margin: 30px 0 20px 0; color: #232F3E; font-size: 26px; font-weight: 800;">$1</h1>');
      
      // Convert bold and italic
      optimizedArticle = optimizedArticle.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      optimizedArticle = optimizedArticle.replace(/\*(.+?)\*/g, '<em>$1</em>');
      
      // Split into blocks
      const blocks = optimizedArticle.split('\n\n');
      const processedBlocks = [];
      
      for (let block of blocks) {
        block = block.trim();
        if (!block) continue;
        
        // Skip if already HTML tag
        if (block.startsWith('<h')) {
          processedBlocks.push(block);
          continue;
        }
        
        // Handle numbered lists (steps)
        if (/^\d+\./.test(block)) {
          const lines = block.split('\n');
          const listItems = [];
          let currentItem = '';
          
          for (const line of lines) {
            if (/^\d+\./.test(line.trim())) {
              if (currentItem) {
                listItems.push(`<li style="margin: 10px 0;">${currentItem.trim()}</li>`);
              }
              currentItem = line.replace(/^\d+\.\s*/, '');
            } else if (line.trim()) {
              currentItem += '<br>' + line.trim();
            }
          }
          if (currentItem) {
            listItems.push(`<li style="margin: 10px 0;">${currentItem.trim()}</li>`);
          }
          
          processedBlocks.push(`<ol style="margin: 15px 0; padding-left: 25px;">${listItems.join('')}</ol>`);
          continue;
        }
        
        // Handle bullet lists
        if (/^[-•]/.test(block)) {
          const lines = block.split('\n');
          const listItems = [];
          let currentItem = '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (/^[-•]/.test(trimmedLine)) {
              // Start of new bullet item
              if (currentItem) {
                listItems.push(`<li style="margin: 8px 0;">${currentItem.trim()}</li>`);
              }
              currentItem = trimmedLine.replace(/^[-•]\s*/, '');
            } else if (trimmedLine) {
              // Continuation of previous item
              currentItem += '<br>' + trimmedLine;
            }
          }
          if (currentItem) {
            listItems.push(`<li style="margin: 8px 0;">${currentItem.trim()}</li>`);
          }
          
          processedBlocks.push(`<ul style="margin: 15px 0; padding-left: 25px; list-style-type: disc;">${listItems.join('')}</ul>`);
          continue;
        }
        
        // Regular paragraph - preserve line breaks
        const paragraphContent = block.replace(/\n/g, '<br>');
        processedBlocks.push(`<p style="margin: 10px 0; line-height: 1.6;">${paragraphContent}</p>`);
      }
      
      optimizedArticle = processedBlocks.join('\n');
      
      // Clean up empty tags
      optimizedArticle = optimizedArticle.replace(/<p[^>]*><\/p>/g, '');
      optimizedArticle = optimizedArticle.replace(/<p[^>]*>\s*<br>\s*<\/p>/g, '');
      optimizedArticle = optimizedArticle.replace(/<li[^>]*><\/li>/g, '');

      // Validate for hallucinations
      console.log('Validating...');

      let sourceLabel, sourceSection;
      if (inputMode === 'youtube') {
        sourceLabel = 'VIDEO TRANSCRIPT';
        sourceSection = `VIDEO TRANSCRIPT:\n${transcriptText}`;
      } else if (inputMode === 'combined') {
        sourceLabel = 'SOURCE MATERIALS (article + transcript)';
        sourceSection = `ORIGINAL KB ARTICLE:\n${article}\n\nVIDEO TRANSCRIPT:\n${transcriptText}`;
      } else {
        sourceLabel = 'ORIGINAL ARTICLE';
        sourceSection = `ORIGINAL:\n${article}`;
      }

      const validationPrompt = `Compare ${sourceLabel} vs GENERATED ARTICLE. List any NEW facts in the generated article that are NOT supported by the source.

WHAT COUNTS AS HALLUCINATION:
- New statistics or numbers (e.g., "15%" when original says "low")
- Added product features or specs not mentioned
- New troubleshooting steps not in original
- Made-up error codes or technical details
- Specific timelines not in original (e.g., "30 seconds" when original says "briefly")
- Assumed causes (e.g., "2.4GHz" when original says "WiFi")

WHAT DOES NOT COUNT:
- Reorganized structure, clearer phrasing, generic language
- Question-format title, section headers, expected results
- Generic time estimates like "a few minutes"
- Success Validation section

Format:
## FACTUAL ACCURACY
[1-2 sentences]

## POTENTIAL HALLUCINATIONS
- [List each]
Or: "None detected"

## HALLUCINATION SCORE
Score: [0-10]

## RECOMMENDATION
[APPROVE / REVIEW NEEDED / REJECT]

---
${sourceSection}

GENERATED ARTICLE:
${optimizedArticle}`;

      const validationResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20251001',
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
        inputMode,
        sourceWords: sourceWordCount,
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
        return res.status(400).json({ error: 'Missing userEdits' });
      }

      const { optimizedArticle, keptIssues, removedIssues } = userEdits;

      if (!optimizedArticle) {
        return res.status(400).json({ error: 'Missing optimizedArticle' });
      }

      console.log('Finalizing...');

      let instructions = `Edit this KB article based on user feedback.

OPTIMIZED ARTICLE:
${optimizedArticle}

USER FEEDBACK:
`;

      if (removedIssues && removedIssues.length > 0) {
        instructions += `\nREMOVE these items completely:\n`;
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

      instructions += `\nGenerate final article:
1. Remove marked items completely
2. Update items with edited text exactly as provided
3. Keep everything else unchanged
4. Maintain exact HTML formatting and structure
5. Preserve all <h2>, <h3>, <p>, <ol>, <ul>, <li>, <strong>, <br> tags
6. Keep all inline styles

Return ONLY the HTML content, no markdown blocks, no explanations.`;

      const finalResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20251001',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: instructions
        }]
      });

      let finalArticle = finalResponse.content[0].text;
      
      // Strip markdown wrappers
      finalArticle = finalArticle.replace(/^```html\n?/i, '').replace(/\n?```$/i, '');
      finalArticle = finalArticle.trim();

      console.log('Finalize complete');

      return res.status(200).json({
        success: true,
        finalArticle
      });
    }

    return res.status(400).json({ error: 'Invalid mode' });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to optimize article',
      message: error.message 
    });
  }
}
