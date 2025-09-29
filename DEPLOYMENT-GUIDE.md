# YCT ND1 Computer Science - Complete Deployment Guide

This guide will walk you through setting up the complete YCT ND1 Computer Science educational platform using Ubuntu Cloud, Vercel, and Supabase.

## 📋 Prerequisites

- Ubuntu Cloud server (Ubuntu 20.04+ recommended)
- Vercel account (free tier available)
- Supabase account (free tier available)
- Domain name (optional, but recommended)
- Basic knowledge of command line and Git

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Ubuntu Cloud  │    │   Supabase      │
│   (Frontend)    │◄──►│   (Backend API) │◄──►│   (Databases)   │
│   React App     │    │   Express.js    │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Step 1: Supabase Setup

### 1.1 Create Main Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `yct-nd1-main`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be ready (2-3 minutes)

### 1.2 Configure Main Database

1. Go to your project dashboard
2. Click on "SQL Editor" in the sidebar
3. Click "New Query"
4. Copy and paste the contents of `sql/main-database-setup.sql`
5. Click "Run" to execute the script
6. Verify tables were created in the "Table Editor"

### 1.3 Get Supabase Credentials

1. Go to "Settings" → "API"
2. Copy the following values (you'll need them later):
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon Key**: `eyJ...` (public key)
   - **Service Role Key**: `eyJ...` (secret key)

### 1.4 Create Course Supabase Projects

For each course, you'll need a separate Supabase project:

1. Create a new Supabase project for each course
2. Name them: `yct-nd1-course-1`, `yct-nd1-course-2`, etc.
3. Run the `sql/course-database-setup.sql` script in each course database
4. Save the credentials for each course

## 🌐 Step 2: Vercel Setup (Frontend)

### 2.1 Prepare for Deployment

1. Fork or clone this repository to your GitHub account
2. Make sure all files are committed and pushed to GitHub

### 2.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.3 Environment Variables

In Vercel dashboard, go to your project → Settings → Environment Variables:

```bash
VITE_SUPABASE_URL=https://your-main-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-main-anon-key
VITE_API_URL=https://your-ubuntu-server.com/api
```

### 2.4 Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Note your Vercel URL: `https://your-project.vercel.app`

## 🖥️ Step 3: Ubuntu Cloud Setup (Backend)

### 3.1 Server Setup

1. Launch an Ubuntu 20.04+ server
2. Update the system:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

### 3.2 Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3.3 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 3.4 Install PostgreSQL Client (Optional)

```bash
sudo apt install postgresql-client -y
```

### 3.5 Clone and Setup Application

```bash
# Clone your repository
git clone https://github.com/your-username/yct-nd1-platform.git
cd yct-nd1-platform

# Install dependencies
npm install

# Install production dependencies only
npm ci --production
```

### 3.6 Environment Configuration

Create environment file:

```bash
nano .env
```

Add the following content:

```bash
# Main Supabase Configuration
SUPABASE_URL=https://your-main-project-id.supabase.co
SUPABASE_ANON_KEY=your-main-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-main-service-role-key

# Database Configuration
DATABASE_URL=postgresql://postgres:your-password@db.your-main-project-id.supabase.co:5432/postgres

# Server Configuration
NODE_ENV=production
PORT=5000

# CORS Configuration
CORS_ORIGIN=https://your-vercel-app.vercel.app

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Course Database Credentials (add as needed)
COURSE_1_URL=https://your-course-1-project-id.supabase.co
COURSE_1_ANON_KEY=your-course-1-anon-key
COURSE_1_SERVICE_KEY=your-course-1-service-key

COURSE_2_URL=https://your-course-2-project-id.supabase.co
COURSE_2_ANON_KEY=your-course-2-anon-key
COURSE_2_SERVICE_KEY=your-course-2-service-key

# Add more courses as needed...
```

### 3.7 Build and Start Application

```bash
# Build the application
npm run build

# Start with PM2
pm2 start dist/index.js --name "yct-nd1-api"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 3.8 Configure Nginx (Reverse Proxy)

Install Nginx:

```bash
sudo apt install nginx -y
```

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/yct-nd1
```

Add the following content:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or server IP

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # API routes
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static files (if needed)
    location / {
        proxy_pass https://your-vercel-app.vercel.app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/yct-nd1 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3.9 Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## 🔧 Step 4: Application Configuration

### 4.1 Update Vercel Environment Variables

Update your Vercel project with the correct API URL:

```bash
VITE_API_URL=https://your-domain.com/api
```

### 4.2 Create Your Creator Account

1. Go to your Supabase main project
2. Go to "Authentication" → "Users"
3. Click "Add user"
4. Create your account with your email
5. Go to "SQL Editor" and run:

```sql
-- Make yourself the creator
UPDATE users 
SET is_creator = true 
WHERE email = 'your-email@example.com';
```

### 4.3 Initialize Platform Settings

Run this SQL in your main Supabase database:

```sql
-- Set platform name
INSERT INTO platform_settings (key, value, updated_by) 
VALUES ('platform_name', '"YCT ND1 Computer Science"', (SELECT id FROM users WHERE is_creator = true LIMIT 1))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Enable anonymous hub
INSERT INTO platform_settings (key, value, updated_by) 
VALUES ('anonymous_hub_enabled', 'true', (SELECT id FROM users WHERE is_creator = true LIMIT 1))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

## 🎯 Step 5: Course Management

### 5.1 Add Course Reps

1. Course reps need to create Supabase accounts
2. They should provide you with their Supabase project credentials
3. Use the admin panel to add courses with their database details

### 5.2 Course Setup Process

For each course:

1. Course rep creates a Supabase project
2. Course rep runs the course database setup script
3. Course rep provides you with:
   - Supabase URL
   - Anon Key
   - Service Role Key
4. You add the course through the admin panel
5. You assign the course rep as course admin

## 🔍 Step 6: Testing and Verification

### 6.1 Test Frontend

1. Visit your Vercel URL
2. Try to register a new account
3. Test login functionality
4. Check if all pages load correctly

### 6.2 Test Backend API

```bash
# Test API health
curl https://your-domain.com/api/settings

# Test authentication (replace with your token)
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-domain.com/api/auth/me
```

### 6.3 Test Database Connections

1. Check if users are created in Supabase
2. Verify course data is stored correctly
3. Test course-specific database connections

## 🚨 Step 7: Security and Monitoring

### 7.1 Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 7.2 Monitor Application

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs yct-nd1-api

# Monitor resources
pm2 monit
```

### 7.3 Backup Strategy

1. **Database Backups**: Supabase handles this automatically
2. **Code Backups**: Your code is in Git
3. **Environment Backups**: Keep your `.env` file secure

## 📊 Step 8: Analytics and Monitoring

### 8.1 Vercel Analytics

1. Enable Vercel Analytics in your project
2. Monitor frontend performance
3. Track user engagement

### 8.2 Supabase Monitoring

1. Use Supabase dashboard for database monitoring
2. Set up alerts for unusual activity
3. Monitor API usage and limits

### 8.3 Server Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Monitor system resources
htop
```

## 🔄 Step 9: Maintenance and Updates

### 9.1 Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
npm update

# Restart application
pm2 restart yct-nd1-api
```

### 9.2 Database Maintenance

1. Monitor database performance in Supabase
2. Clean up old data periodically
3. Optimize queries as needed

### 9.3 Application Updates

1. Pull latest changes from Git
2. Install new dependencies
3. Build and restart the application
4. Test thoroughly before deploying

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**: Check CORS_ORIGIN in environment variables
2. **Database Connection**: Verify DATABASE_URL and Supabase credentials
3. **Authentication Issues**: Check JWT_SECRET and Supabase keys
4. **Build Failures**: Check Node.js version and dependencies

### Logs and Debugging

```bash
# View application logs
pm2 logs yct-nd1-api

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
```

### Getting Help

1. Check the logs for error messages
2. Verify all environment variables are set correctly
3. Test each component individually
4. Check Supabase and Vercel dashboards for issues

## 🎉 Step 10: Go Live!

Once everything is working:

1. Update your DNS to point to your server
2. Share the Vercel URL with your students
3. Create your first course
4. Invite students to register
5. Start using the platform!

## 📝 Additional Notes

- **Free Tier Limits**: Be aware of Supabase and Vercel free tier limits
- **Scaling**: As you grow, consider upgrading to paid plans
- **Custom Domain**: You can use a custom domain with Vercel
- **Backup**: Always keep backups of important data
- **Security**: Regularly update dependencies and monitor for security issues

## 🆘 Support

If you encounter any issues:

1. Check this guide first
2. Review the logs
3. Test each component individually
4. Check the GitHub repository for updates
5. Create an issue in the repository if needed

---

**Congratulations!** You now have a fully functional educational platform running on Ubuntu Cloud, Vercel, and Supabase! 🎓
