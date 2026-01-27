# 🚀 Deploy KB Optimizer to Vercel

## 📦 Files You Need

Download these files:
1. ✅ **api/optimize.js** - Serverless function
2. ✅ **index-vercel.html** - Frontend (rename to index.html)
3. ✅ **package-vercel.json** - Dependencies (rename to package.json)
4. ✅ **vercel.json** - Vercel configuration

---

## 📁 Folder Structure for Vercel

```
kb-optimizer-vercel/
│
├── index.html              ← Frontend (from index-vercel.html)
├── package.json            ← Dependencies (from package-vercel.json)
├── vercel.json             ← Vercel config
│
└── api/
    └── optimize.js         ← Serverless function
```

---

## 🚀 Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Easiest)

#### Step 1: Create Project Folder
```bash
mkdir kb-optimizer-vercel
cd kb-optimizer-vercel
```

#### Step 2: Place Files
```
kb-optimizer-vercel/
├── index.html              ← Rename index-vercel.html
├── package.json            ← Rename package-vercel.json
├── vercel.json
└── api/
    └── optimize.js
```

#### Step 3: Initialize Git (if not already)
```bash
git init
git add .
git commit -m "Initial commit - KB Optimizer"
```

#### Step 4: Push to GitHub/GitLab
```bash
# Create new repo on GitHub first, then:
git remote add origin https://github.com/yourusername/kb-optimizer.git
git branch -M main
git push -u origin main
```

#### Step 5: Deploy on Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Vercel auto-detects settings
5. **Add Environment Variable:**
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-xxxxxxxxxxxxx`
6. Click "Deploy"

#### Step 6: Get Your URL
After deployment:
- Your app will be at: `https://your-project.vercel.app`
- Share this URL with your team!

---

### Option 2: Deploy via Vercel CLI (Faster)

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```

#### Step 3: Deploy
```bash
cd kb-optimizer-vercel
vercel
```

#### Step 4: Add API Key
```bash
# Add environment variable
vercel env add ANTHROPIC_API_KEY
# Paste your API key when prompted
```

#### Step 5: Deploy to Production
```bash
vercel --prod
```

You'll get a URL like: `https://kb-optimizer-xxxxx.vercel.app`

---

## 🔐 Setting Environment Variables

### Via Vercel Dashboard:
1. Go to your project on Vercel
2. Click "Settings"
3. Click "Environment Variables"
4. Add:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-api03-xxxxxxxxxxxxx`
   - **Environment:** Production, Preview, Development
5. Click "Save"

### Via CLI:
```bash
vercel env add ANTHROPIC_API_KEY production
# Paste your key when prompted
```

---

## ✅ Verification

After deployment:

1. **Visit your URL:** `https://your-project.vercel.app`
2. **Test the tool:**
   - Click "Load Example"
   - Click "Optimize Article"
   - Should complete in 30-45 seconds
3. **Check dynamic comparison:**
   - Scroll down after optimization
   - See your before/after data

---

## 🌐 Share with Your Team

Once deployed, share:
```
🎉 KB Article Optimizer is now live!

🔗 URL: https://your-project.vercel.app

What it does:
✅ Optimizes KB articles for Amazon Q
✅ Maintains customer-friendly length (±20%)
✅ Shows before/after comparison
✅ 30-45 second processing

How to use:
1. Go to the URL
2. Paste your article or click "Load Example"
3. Click "Optimize Article"
4. Wait 30-45 seconds
5. Copy the optimized version

No login required - just visit and use!
```

---

## 💰 Pricing

**Vercel:**
- ✅ Free tier: 100GB bandwidth/month
- ✅ Unlimited requests
- ✅ Perfect for team use

**Anthropic API:**
- ~$0.05-0.10 per article optimization
- 100 articles = ~$5-10/month
- 500 articles = ~$25-50/month

---

## 🔧 Updating Your Deployment

### When you make changes:

#### Via GitHub:
```bash
git add .
git commit -m "Updated optimizer"
git push
```
Vercel auto-deploys!

#### Via CLI:
```bash
vercel --prod
```

---

## 🎯 Custom Domain (Optional)

Want a custom URL like `kb-optimizer.yourcompany.com`?

1. Go to Vercel Dashboard
2. Click your project
3. Go to "Settings" > "Domains"
4. Add your custom domain
5. Update DNS records as instructed
6. Done!

---

## 📊 Monitoring

### Check Usage:
1. Vercel Dashboard > Your Project > Analytics
2. See:
   - Page views
   - Response times
   - Errors

### Check API Costs:
1. Go to console.anthropic.com
2. Check "Usage" section
3. Monitor monthly spend

---

## 🆘 Troubleshooting

### "API Error: 401"
**Fix:** Check environment variable is set correctly
```bash
vercel env ls
# Should show ANTHROPIC_API_KEY
```

### "Function Timeout"
**Fix:** Vercel free tier has 10-second timeout for serverless functions. Upgrade to Pro ($20/month) for 60-second timeout.

**Alternative:** Use Railway or Render for backend (no timeout limits on free tier)

### "CORS Error"
**Fix:** Already handled in optimize.js. If issue persists, check browser console.

---

## 🎓 Pro Tips

### Tip 1: Use Preview Deployments
Every git push creates a preview URL for testing before production

### Tip 2: Monitor Errors
Set up error tracking in Vercel dashboard

### Tip 3: Cache Optimization
Vercel auto-caches static assets for faster loads

### Tip 4: Team Access
Invite team members to Vercel project for monitoring

---

## ⚠️ Important Limitations

### Vercel Free Tier:
- ✅ Unlimited requests
- ✅ 100GB bandwidth/month
- ⚠️ 10-second function timeout (may be tight for optimization)
- ⚠️ 1024 MB memory per function

### If You Hit Limits:
**Option A:** Upgrade to Vercel Pro ($20/month)
- 60-second timeout
- More memory
- Better for production

**Option B:** Move backend to Railway/Render
- Keep frontend on Vercel (free)
- Backend on Railway (free tier available)
- No timeout issues

---

## 🚀 Alternative: Railway Deployment (No Timeout)

If Vercel timeouts are an issue:

**Railway (for backend only):**
```bash
# Deploy backend to Railway
railway login
railway init
railway up

# Get backend URL: https://kb-optimizer-backend.railway.app
```

**Update frontend to use Railway backend:**
```javascript
// In index.html, change API URL:
fetch('https://kb-optimizer-backend.railway.app/api/optimize', ...)
```

---

## 📝 Quick Commands Reference

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check environment variables
vercel env ls

# Add environment variable
vercel env add ANTHROPIC_API_KEY

# View logs
vercel logs

# Remove deployment
vercel remove
```

---

## ✨ You're Live!

After deployment:
- ✅ Public URL accessible by anyone
- ✅ No server maintenance needed
- ✅ Auto-scales with usage
- ✅ Free hosting (Vercel free tier)
- ✅ Share with entire team
- ✅ Updates via git push

**Your team can now optimize KB articles from anywhere!** 🎉

---

**Estimated Setup Time:** 10-15 minutes
**Estimated Cost:** Free (Vercel) + API usage (~$0.05-0.10 per article)
