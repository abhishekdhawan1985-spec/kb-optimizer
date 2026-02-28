# YouTube Video → KB Article Feature Plan

## Summary
Add a YouTube URL input below the article textarea. When a user provides a YouTube video URL (with no article required), the app fetches the video's transcript, then uses Claude to generate an optimized KB article from that transcript — applying the existing 15-rule optimization system and hallucination detection.

---

## Changes Required

### 1. `package.json`
- Add `"youtube-transcript": "^1.2.1"` to dependencies

---

### 2. `api/optimize.js`

**a) Add import:**
```js
const { YoutubeTranscript } = require('youtube-transcript');
```

**b) Add helper: `extractVideoId(url)`**
Parses YouTube URL formats:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`

Returns the video ID string or `null` if invalid.

**c) Add helper: `fetchYouTubeTranscript(url)`**
- Calls `YoutubeTranscript.fetchTranscript(videoId)`
- Joins `{text}` items into a single readable string
- Throws descriptive errors (no captions, invalid URL, etc.)

**d) Update request validation:**
- Accept `youtubeUrl` as an optional body param
- Require either `article` OR `youtubeUrl` (not necessarily both)
- If `youtubeUrl` is provided: fetch transcript and use it as the source content
- If only `article` is provided: existing behavior unchanged

**e) Update optimization prompt when YouTube mode:**
- Change framing from "optimize this KB article" to "generate a KB article based on this video transcript"
- Still apply all 15 Amazon Q optimization rules
- Include transcript word count in analysis

**f) Update hallucination detection prompt when YouTube mode:**
- Compare original transcript vs. generated article (instead of original article vs. optimized article)
- Flag facts in the generated article not supported by the transcript

---

### 3. `index.html`

**a) Add YouTube input section below the textarea:**
```
[existing KB article textarea]

──── OR generate from a YouTube video ────
[YouTube URL input]  [Generate from YouTube ▶]
```

**b) Add `generateFromYouTube()` function:**
- Reads the YouTube URL from the new input
- Validates it looks like a YouTube URL client-side
- Calls `POST /api/optimize` with `{ youtubeUrl, mode: 'optimize' }`
- Shows YouTube-specific loading messages:
  - "Step 1/2: Fetching YouTube transcript..."
  - "Step 2/2: Generating KB article..."
- Reuses all existing display logic (comparison, hallucination editor, final article)

**c) Update loading/result labels for YouTube mode:**
- Comparison section: "Video Transcript" vs "Generated Article" (instead of "Original" vs "Optimized")
- Store `globalState.sourceMode = 'youtube' | 'article'` to toggle labels

---

## Data Flow (YouTube Mode)

```
User pastes YouTube URL
        ↓
frontend: generateFromYouTube()
        ↓
POST /api/optimize { youtubeUrl, mode: 'optimize' }
        ↓
backend: fetchYouTubeTranscript(youtubeUrl)
        ↓
Claude: generate optimized KB article from transcript
        ↓
Claude: hallucination detection (transcript vs. generated article)
        ↓
Response: { optimizedArticle, analysis, validation }
        ↓
[same UI flow as article mode: editor → finalize → export]
```

---

## Error Handling

- Invalid YouTube URL → show error "Please enter a valid YouTube URL"
- No captions/transcript available → show error "This video does not have a transcript. Try a video with captions enabled."
- Transcript too short → show error "Video transcript is too short to generate a meaningful KB article"
- Network/API error → existing error handling catches it

---

## Files Modified
1. `package.json` — add `youtube-transcript` dependency
2. `api/optimize.js` — add transcript fetching + updated prompts
3. `index.html` — add YouTube URL input + `generateFromYouTube()` function
