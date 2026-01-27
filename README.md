# 🚀 KB Optimizer - Vercel Deployment

## 📦 What's This Package

A **Vercel-ready** version of the KB Article Optimizer for Amazon Q.

- ✅ Serverless architecture (no server management)
- ✅ Auto-scaling (handles any traffic)
- ✅ Free tier available
- ✅ Global CDN
- ✅ HTTPS enabled by default
- ✅ Deploy in 5 minutes

---

## 📁 Package Contents

```
kb-optimizer-vercel/
│
├── index.html              ← Frontend (dynamic UI)
├── package.json            ← Dependencies
├── vercel.json             ← Vercel configuration
├── .gitignore             ← Git ignore rules
│
├── api/
│   └── optimize.js         ← Serverless backend function
│
├── README.md               ← This file (quick start)
└── DEPLOYMENT-GUIDE.md     ← Detailed instructions
```

---

## 🚀 Quick Deploy (2 Methods)

### **Method 1: Vercel Dashboard (Easiest - 5 minutes)**

#### Step 1: Push to GitHub
```bash
# Initialize git (if not already)
git init
git add .
git commit -m "KB Optimizer for Vercel"

# Create new repo on GitHub, then:
git remote add origin https://github.com/yourusername/kb-optimizer.git
git branch -M main
git push -u origin main
```

#### Step 2: Deploy on Vercel
1. Go to **https://vercel.com/new**
2. Click **"Import Project"**
3. Select your GitHub repository
4. Vercel auto-detects settings ✅
5. **Add Environment Variable:**
   - Click "Environment Variables"
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-your-key-here`
6. Click **"Deploy"**
7. Wait 2-3 minutes ⏱️
8. Get your URL! 🎉

**Your app will be at:** `https://kb-optimizer-xxxxx.vercel.app`

---

### **Method 2: Vercel CLI (Faster - 2 minutes)**

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login
```bash
vercel login
```

#### Step 3: Deploy
```bash
vercel
```

Follow prompts:
- Setup and deploy? **Y**
- Which scope? **[Select your account]**
- Link to existing project? **N**
- What's your project's name? **kb-optimizer**
- In which directory is your code located? **./[Enter]**

#### Step 4: Add API Key
```bash
vercel env add ANTHROPIC_API_KEY
```
Paste your key when prompted: `sk-ant-api03-your-key`

Select environments: **Production, Preview, Development**

#### Step 5: Deploy to Production
```bash
vercel --prod
```

**Done!** You'll get a URL like: `https://kb-optimizer.vercel.app`

---

## 🔐 Environment Variables

You need to add your Anthropic API key:

### **Via Vercel Dashboard:**
1. Go to your project on Vercel
2. Click **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-api03-your-actual-key`
   - **Environments:** All (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** (Deployments → Latest → Redeploy)

### **Via CLI:**
```bash
vercel env add ANTHROPIC_API_KEY
# Paste: sk-ant-api03-your-key
# Select: Production, Preview, Development (space to select, enter to confirm)
```

Get your API key from: **https://console.anthropic.com**

---

## ✅ Verify Deployment

After deployment:

1. **Visit your URL:** `https://your-project.vercel.app`
2. **Test the tool:**
   - Click "Load Example"
   - Click "Optimize Article"
   - Should complete in 30-45 seconds
3. **Check dynamic comparison:**
   - Scroll down after optimization
   - See before/after with your actual data

---

## 🌐 Share with Your Team

Once deployed, share this:

```
🎉 KB Article Optimizer - Now Live!

🔗 URL: https://kb-optimizer.vercel.app
     (or your custom URL)

✅ No login required - just visit and use!
✅ Works from anywhere (laptop, phone, tablet)
✅ Always up-to-date (auto-deploys on git push)

How to use:
1. Go to the URL
2. Paste your KB article (or click "Load Example")
3. Click "Optimize Article"
4. Wait 30-45 seconds
5. See dynamic before/after comparison
6. Copy the optimized version

Questions? Check the docs or contact me.
```

---

## 🔄 Update Your Deployment

### **Via GitHub (Automatic):**
```bash
# Make changes to files
git add .
git commit -m "Updated optimizer"
git push
```
**Vercel auto-deploys in 2-3 minutes!** ✨

### **Via CLI:**
```bash
# Make changes, then:
vercel --prod
```

---

## ⚙️ Vercel Configuration

The `vercel.json` file configures:
- Serverless functions in `/api` directory
- API routes mapping
- Environment variables
- Build settings

**You don't need to modify this file** - it's pre-configured!

---

## 🎯 Custom Domain (Optional)

Want `kb-optimizer.yourcompany.com` instead of `.vercel.app`?

### **Steps:**
1. Go to Vercel Dashboard → Your Project
2. Click **Settings** → **Domains**
3. Click **"Add Domain"**
4. Enter your domain: `kb-optimizer.yourcompany.com`
5. Follow DNS instructions (add A/CNAME record)
6. Wait 5-10 minutes for DNS propagation
7. **Done!** Auto HTTPS enabled ✅

---

## 💰 Pricing

### **Vercel Free Tier:**
- ✅ 100GB bandwidth/month
- ✅ Unlimited serverless function invocations
- ✅ Unlimited deployments
- ⚠️ 10-second function timeout

### **Potential Issue:**
Your optimization takes **30-45 seconds**, but Vercel free tier has **10-second timeout**.

### **Solutions:**

#### **Option A: Upgrade to Vercel Pro ($20/month)**
- ✅ 60-second timeout (perfect for your use case)
- ✅ More bandwidth
- ✅ Better performance
- ✅ Team features

#### **Option B: Hybrid Approach (Stay Free)**
- **Frontend:** Keep on Vercel (free) ✅
- **Backend:** Move to Railway or Render (free, no timeout) ✅
- Update `index.html` to call Railway backend

#### **Option C: Optimize Function Speed**
- Reduce `max_tokens` in `api/optimize.js`
- May complete faster but less detailed

---

## 📊 Monitoring

### **View Logs:**
```bash
vercel logs
```

### **Check Deployments:**
```bash
vercel ls
```

### **View in Dashboard:**
1. Go to **https://vercel.com/dashboard**
2. Click your project
3. See:
   - Deployments
   - Analytics
   - Logs
   - Performance

---

## 🆘 Troubleshooting

### **"Function Timeout" Error**
**Problem:** Optimization takes >10 seconds (free tier limit)

**Solutions:**
1. Upgrade to Vercel Pro ($20/mo for 60s timeout)
2. Use Railway/Render for backend (free, no timeout)
3. Optimize function speed (reduce max_tokens)

### **"API Error: 401 Unauthorized"**
**Problem:** API key not set or incorrect

**Fix:**
```bash
# Check if key is set
vercel env ls

# Add/update key
vercel env add ANTHROPIC_API_KEY
# OR update in dashboard

# Redeploy
vercel --prod
```

### **"Module Not Found"**
**Problem:** Dependencies not installed

**Fix:**
Vercel auto-installs from `package.json`. If issue persists:
```bash
# Locally test
npm install
vercel dev
```

### **Changes Not Showing**
**Problem:** Old version cached

**Fix:**
1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Check deployment status on Vercel dashboard
3. Make sure you deployed to production: `vercel --prod`

---

## 🔧 Local Development

Test locally before deploying:

```bash
# Install dependencies
npm install

# Install Vercel CLI
npm install -g vercel

# Run locally (simulates Vercel environment)
vercel dev
```

Access at: **http://localhost:3000**

This runs the same serverless functions locally for testing!

---

## 📈 Performance

### **Expected Performance:**
- **First load:** 1-2 seconds
- **Optimization:** 30-45 seconds (depends on article length)
- **Global CDN:** Fast worldwide
- **Auto-scaling:** Handles traffic spikes

### **Optimization Tips:**
- Frontend assets cached on CDN
- Serverless functions auto-scale
- No server management needed

---

## 🎓 Next Steps

### **For First-Time Deployment:**
1. Push code to GitHub
2. Import to Vercel
3. Add API key
4. Deploy
5. Share URL with team

### **For Updates:**
1. Make changes
2. Git push
3. Auto-deploys!

### **For Custom Domain:**
1. Add domain in Vercel settings
2. Update DNS records
3. Wait for propagation

---

## ✨ Benefits of Vercel Deployment

✅ **Zero Server Management** - No infrastructure to maintain
✅ **Auto-Scaling** - Handles 10 or 10,000 users
✅ **Global CDN** - Fast everywhere in the world
✅ **HTTPS Included** - SSL certificates automatic
✅ **Git Integration** - Push to deploy
✅ **Preview Deployments** - Test before production
✅ **Easy Rollbacks** - One-click to previous version
✅ **Team Collaboration** - Invite team members

---

## 🎯 Success Checklist

After deployment:

- [ ] Site accessible at your Vercel URL
- [ ] "Load Example" button works
- [ ] "Optimize Article" completes (watch timeout!)
- [ ] Results display correctly
- [ ] Dynamic comparison shows your data
- [ ] Copy and Download buttons work
- [ ] Environment variable set (API key)
- [ ] Custom domain configured (optional)
- [ ] Team has access to URL
- [ ] Documentation shared

---

## 💡 Pro Tips

**Tip 1:** Use preview deployments for testing
```bash
vercel  # Creates preview URL
vercel --prod  # Deploys to production
```

**Tip 2:** Enable Vercel Analytics
Free basic analytics included - check traffic and performance

**Tip 3:** Set up notifications
Get alerts for deployment failures in Vercel dashboard

**Tip 4:** Use environment variable inheritance
Set once, use in all environments

**Tip 5:** GitHub integration is powerful
Every PR gets its own preview URL automatically!

---

## 📞 Support

### **Vercel Documentation:**
- https://vercel.com/docs
- https://vercel.com/docs/serverless-functions/introduction

### **Troubleshooting:**
- Check DEPLOYMENT-GUIDE.md for detailed help
- View logs: `vercel logs`
- Check status: https://vercel-status.com

### **API Key Issues:**
- Console: https://console.anthropic.com
- Documentation: https://docs.anthropic.com

---

## 🚀 Ready to Deploy!

```bash
# Quick start:
git init
git add .
git commit -m "Initial commit"
git push origin main

# Then import on Vercel:
# https://vercel.com/new

# Or use CLI:
vercel
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

**Your KB Optimizer will be live in 5 minutes!** 🎉

---

**Package Version:** 1.0.0  
**Platform:** Vercel Serverless  
**Deployment Time:** 5 minutes  
**Cost:** Free tier available ($0-20/month)
