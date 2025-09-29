# 🚀 YCT ND1 Computer Science - Beginner Setup Guide

**Don't worry if you're new to this!** This guide is designed for complete beginners. Every step is explained in detail with screenshots and troubleshooting tips.

## 🎯 What You're Building

You're creating a **complete educational platform** where:
- Students can register and login
- Admins can create courses
- Students can discuss topics
- Anonymous posting is available
- Points and leaderboards motivate students
- Everything works on phones and computers

## 📋 What You Need (All FREE!)

1. **Computer** (Windows, Mac, or Linux)
2. **Internet connection**
3. **Email address** (for accounts)
4. **30-60 minutes** of your time

## 🏗️ Step-by-Step Setup

### Step 1: Get Your Code (5 minutes)

1. **Download the code:**
   - Click the green "Code" button on GitHub
   - Click "Download ZIP"
   - Extract the ZIP file to your Desktop
   - You should see a folder called `Yct-main`

2. **Open Command Prompt/Terminal:**
   - **Windows**: Press `Windows + R`, type `cmd`, press Enter
   - **Mac**: Press `Cmd + Space`, type "Terminal", press Enter
   - **Linux**: Press `Ctrl + Alt + T`

3. **Navigate to your folder:**
   ```bash
   cd Desktop/Yct-main
   ```

### Step 2: Install Node.js (10 minutes)

1. **Go to** [nodejs.org](https://nodejs.org)
2. **Download** the LTS version (Long Term Support)
3. **Install** by double-clicking the downloaded file
4. **Follow** the installation wizard (click "Next" on everything)
5. **Restart** your computer when done

6. **Verify installation:**
   - Open Command Prompt/Terminal again
   - Type: `node --version`
   - You should see something like `v18.17.0` or higher
   - Type: `npm --version`
   - You should see something like `9.6.7` or higher

**✅ If you see version numbers, you're good to go!**

### Step 3: Install Dependencies (5 minutes)

In your Command Prompt/Terminal, make sure you're in the `Yct-main` folder, then run:

```bash
npm install
```

**What this does:** Downloads all the code libraries your platform needs.

**Wait for it to finish** - you'll see a lot of text scrolling. When it's done, you should see something like "added 1000 packages".

### Step 4: Set Up Supabase (15 minutes)

**Supabase is your database** - it stores all your data (users, courses, posts, etc.)

1. **Go to** [supabase.com](https://supabase.com)
2. **Click** "Start your project"
3. **Sign up** with your email
4. **Verify** your email (check your inbox)

5. **Create your first project:**
   - Click "New Project"
   - **Organization**: Choose "Personal" (it's free)
   - **Name**: `yct-nd1-main`
   - **Database Password**: Click "Generate a password" and **SAVE IT SOMEWHERE SAFE**
   - **Region**: Choose the closest to your location
   - Click "Create new project"
   - **Wait 2-3 minutes** for it to finish

6. **Get your credentials:**
   - In your Supabase dashboard, click "Settings" (gear icon)
   - Click "API" in the left menu
   - **Copy these 3 things** (you'll need them):
     - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
     - **Anon Key** (starts with `eyJ...`)
     - **Service Role Key** (starts with `eyJ...`)

### Step 5: Set Up Your Database (10 minutes)

1. **In Supabase**, click "SQL Editor" in the left menu
2. **Click** "New Query"
3. **Open** the file `sql/main-database-setup.sql` in your project folder
4. **Copy ALL the text** from that file
5. **Paste it** into the Supabase SQL editor
6. **Click** "Run" (or press Ctrl+Enter)
7. **Wait** for it to finish (you should see "Success" message)

### Step 6: Configure Your App (5 minutes)

1. **In your project folder**, find the file `env.example`
2. **Copy it** and rename the copy to `.env`
3. **Open** the `.env` file in a text editor (Notepad is fine)
4. **Replace** the placeholder values with your real Supabase credentials:

```bash
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-key-here
DATABASE_URL=postgresql://postgres:your-actual-password@db.your-actual-project-id.supabase.co:5432/postgres
```

**Replace:**
- `your-actual-project-id` with your Project URL (without https:// and .supabase.co)
- `your-actual-anon-key-here` with your Anon Key
- `your-actual-service-key-here` with your Service Role Key
- `your-actual-password` with your database password

### Step 7: Test Your App (5 minutes)

1. **In Command Prompt/Terminal**, run:
   ```bash
   npm run dev
   ```

2. **Wait** for it to start (you'll see "Local: http://localhost:5000")

3. **Open your browser** and go to: `http://localhost:5000`

4. **You should see** your platform! Try registering a new account.

**🎉 Congratulations! Your platform is running locally!**

## 🚀 Going Live (Optional - 30 minutes)

If you want to put your platform on the internet so others can use it:

### Deploy Frontend to Vercel

1. **Go to** [vercel.com](https://vercel.com)
2. **Sign up** with your GitHub account
3. **Click** "New Project"
4. **Import** your GitHub repository
5. **Set these settings:**
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. **Add Environment Variables:**
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Anon Key
   - `VITE_API_URL`: `https://your-domain.com/api` (you'll get this later)
7. **Click** "Deploy"

### Deploy Backend to Ubuntu Cloud

1. **Get an Ubuntu server** (DigitalOcean, AWS, or similar)
2. **Follow** the detailed instructions in `DEPLOYMENT-GUIDE.md`
3. **Set up** your domain name
4. **Configure** SSL certificate

## 🔧 Troubleshooting

### "Command not found" errors
- **Make sure** Node.js is installed correctly
- **Restart** your computer after installing Node.js
- **Try** running `npm install` again

### "Cannot connect to database" errors
- **Check** your `.env` file has the correct Supabase credentials
- **Make sure** you ran the SQL setup script in Supabase
- **Verify** your Supabase project is active

### "Port already in use" errors
- **Close** other applications using port 5000
- **Or** change the port in your `.env` file

### App won't start
- **Check** all dependencies are installed: `npm install`
- **Verify** your `.env` file is configured correctly
- **Look** at the error messages in the terminal

## 🆘 Getting Help

### If You're Stuck:

1. **Read the error message** carefully
2. **Check** this guide again
3. **Look** at the `DEPLOYMENT-GUIDE.md` for more details
4. **Search** the error message on Google
5. **Ask** for help in the GitHub repository

### Common Issues:

**"npm: command not found"**
- Node.js isn't installed properly
- Restart your computer and try again

**"Permission denied"**
- On Mac/Linux: try `sudo npm install`
- On Windows: run Command Prompt as Administrator

**"Module not found"**
- Run `npm install` again
- Make sure you're in the right folder

**"Database connection failed"**
- Check your `.env` file
- Make sure Supabase project is active
- Verify you ran the SQL setup script

## 🎯 What's Next?

Once your platform is running:

1. **Create your admin account** (register first user)
2. **Make yourself the creator** (run SQL in Supabase)
3. **Create your first course**
4. **Invite students** to register
5. **Start using** all the features!

## 📚 Understanding Your Platform

### What Each Part Does:

- **Frontend** (`client/`): What users see and interact with
- **Backend** (`server/`): Handles data and business logic
- **Database** (Supabase): Stores all your data
- **SQL Scripts** (`sql/`): Sets up your database structure

### Key Features:

- **User Management**: Registration, login, roles
- **Course Management**: Create and manage courses
- **Discussions**: Students can discuss topics
- **Anonymous Hub**: Anonymous posting
- **Gamification**: Points, badges, leaderboards
- **Admin Panel**: Manage everything

## 🎉 Success!

You now have a **complete educational platform** that can:
- Handle hundreds of students
- Manage multiple courses
- Provide engaging features
- Scale as you grow

**Your students will love it!** 🎓✨

---

**Remember:** This is a professional-grade platform. Take your time, follow each step carefully, and don't hesitate to ask for help if you get stuck!
