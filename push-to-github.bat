@echo off
echo 🚀 YCT ND1 Platform - Push to GitHub
echo ====================================

echo.
echo Step 1: Checking Git installation...
git --version
if %errorlevel% neq 0 (
    echo ❌ Git is not installed. Please install Git first.
    echo Go to: https://git-scm.com
    pause
    exit /b 1
)

echo.
echo Step 2: Initializing Git repository...
git init

echo.
echo Step 3: Adding all files...
git add .

echo.
echo Step 4: Creating initial commit...
git commit -m "Initial commit: Complete YCT ND1 Computer Science Platform"

echo.
echo Step 5: Setting up main branch...
git branch -M main

echo.
echo ✅ Git repository initialized successfully!
echo.
echo Next steps:
echo 1. Go to https://github.com and create a new repository
echo 2. Copy the repository URL
echo 3. Run these commands (replace YOUR_USERNAME and REPO_NAME):
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
echo    git push -u origin main
echo.
echo For detailed instructions, see GITHUB-SETUP-GUIDE.md
echo.
pause
