#!/bin/bash
# BLDG Vision — First-time setup script
# Run this once on your MacBook Pro to scaffold the project
# Make sure you have Node.js 20+, npm, and Supabase CLI installed first

set -e  # Exit on any error

echo "Setting up BLDG Vision..."

# ─── 1. CREATE PROJECT DIRECTORY ─────────────────────────────────────────────
mkdir -p ~/Projects/bldg-vision
cd ~/Projects/bldg-vision

# ─── 2. SCAFFOLD VITE + REACT + TS ───────────────────────────────────────────
npm create vite@latest . -- --template react-ts --yes

# ─── 3. COPY YOUR FILES IN ───────────────────────────────────────────────────
# At this point, copy in the files you downloaded from Claude:
# - CLAUDE.md → ~/Projects/bldg-vision/CLAUDE.md
# - package.json → ~/Projects/bldg-vision/package.json  (replace the generated one)
# - vite.config.ts → ~/Projects/bldg-vision/vite.config.ts  (replace generated)
# - .env.local.example → ~/Projects/bldg-vision/.env.local.example
# - src/types/index.ts → ~/Projects/bldg-vision/src/types/index.ts
# - src/lib/supabase.ts → ~/Projects/bldg-vision/src/lib/supabase.ts
# - src/lib/pulse.ts → ~/Projects/bldg-vision/src/lib/pulse.ts
# - src/lib/ai.ts → ~/Projects/bldg-vision/src/lib/ai.ts

echo "Paste your downloaded files in now, then press Enter to continue..."
read -r

# ─── 4. INSTALL DEPENDENCIES ─────────────────────────────────────────────────
npm install

# ─── 5. INITIALIZE SUPABASE ──────────────────────────────────────────────────
supabase init

# ─── 6. CREATE MIGRATIONS DIRECTORY AND ADD SCHEMA ───────────────────────────
mkdir -p supabase/migrations
mkdir -p supabase/functions/ai-generate

# Copy your schema file:
# supabase/migrations/001_initial.sql → from rapport-schema.sql download
# supabase/functions/ai-generate/index.ts → from download

echo "Copy supabase/migrations/001_initial.sql and supabase/functions/ai-generate/index.ts now, then press Enter..."
read -r

# ─── 7. INITIALIZE GIT ───────────────────────────────────────────────────────
git init
cat > .gitignore << 'EOF'
node_modules
dist
.env.local
.env
*.env
.supabase
.DS_Store
EOF
git add -A
git commit -m "Initial BLDG Vision scaffold"

# ─── 8. SET UP SUPABASE PROJECT ───────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────"
echo "MANUAL STEPS REQUIRED:"
echo ""
echo "1. Go to https://supabase.com/dashboard"
echo "2. Click 'New project'"
echo "3. Name it: bldg-vision"
echo "4. IMPORTANT: This is NOT the NOVATerra project"
echo "5. Save your Project URL and anon key"
echo "6. Copy .env.local.example to .env.local"
echo "7. Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
echo ""
echo "Then run:"
echo "  supabase login"
echo "  supabase link --project-ref [your-project-ref]"
echo "  supabase db push"
echo ""
echo "Then set edge function secrets:"
echo "  supabase secrets set ANTHROPIC_API_KEY=sk-ant-..."
echo "  supabase functions deploy ai-generate"
echo ""
echo "Then create GitHub repo and connect to Vercel."
echo "────────────────────────────────────────"
echo ""
echo "Setup complete. Open ~/Projects/bldg-vision in Claude Code Desktop."
echo "CLAUDE.md is the first thing Claude Code will read."
