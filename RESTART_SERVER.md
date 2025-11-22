# 🚨 CRITICAL: Server Restart Required

## Why Restart is Needed

The `.env` file was updated with:
```env
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
```

**Next.js does NOT automatically reload environment variables!**

Even though the code has been updated, the running server is still using the old (invalid) model name from when it first started.

## How to Restart

### Step 1: Stop the Current Server

In the terminal where `npm run dev` is running, press:
```
Ctrl + C
```

Or from another terminal:
```bash
pkill -f "next dev"
```

### Step 2: Start the Server Again

```bash
npm run dev
```

### Step 3: Verify It's Working

Once the server starts, you should see:
```
✓ Ready in Xms
○ Local: http://localhost:3000
```

## How to Verify the Fix

### Option 1: Browser Test
1. Go to http://localhost:3000
2. Login with: `admin@dentalclinic.com` / `password123`
3. Navigate to any patient
4. Click "Get Recommendations" or "Generate Summary"
5. Should work without errors!

### Option 2: Check Server Logs
After clicking an AI feature, look for this in server logs:
```
[OpenRouter] Making API request: { model: 'google/gemini-2.0-flash-exp:free', ... }
```

If you still see `google/gemini-flash-1.5`, the server hasn't picked up the changes.

### Option 3: Test Chatbot
1. Click the chat icon in the bottom right
2. Type: "What are your office hours?"
3. Should get a response!

## What If It Still Doesn't Work?

### 1. Verify .env File
```bash
cat .env | grep OPENROUTER
```

Should show:
```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
```

### 2. Hard Restart
```bash
# Kill all Node processes
pkill -9 node

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### 3. Check for Multiple Running Servers
```bash
ps aux | grep "next dev"
```

Should only show ONE process. If there are multiple, kill them all and restart.

## Success Indicators

✅ **You'll know it's working when:**
- AI features respond successfully
- No "AI service temporarily unavailable" errors
- Server logs show `model: 'google/gemini-2.0-flash-exp:free'`
- Chatbot answers questions
- Treatment recommendations generate

❌ **Still broken if you see:**
- "No endpoints found for google/gemini-flash-1.5"
- "AI service temporarily unavailable"
- 500 errors in browser console
- Empty responses from AI

---

**IMPORTANT**: You MUST restart the server for the fix to work!
