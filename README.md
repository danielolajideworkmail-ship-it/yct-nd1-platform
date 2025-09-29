# YCT ND1 Computer Science Educational Platform

A comprehensive, modern educational platform built for YCT ND1 Computer Science students. This platform combines course management, discussions, anonymous posting, gamification, and real-time features to create an engaging learning environment.

## 🌟 Features

### 🎓 Course Management
- **Decentralized Architecture**: Each course has its own Supabase database
- **Course Creation**: Easy course setup with admin controls
- **Assignment Management**: Create, manage, and track assignments
- **Media Support**: Upload images, videos, and documents
- **Deadline Tracking**: Automated deadline notifications

### 💬 Discussion System
- **Open Discussions**: Course-specific and general discussions
- **Real-time Comments**: Nested comment system with reactions
- **Search & Filter**: Find discussions by course, tags, or content
- **Identity Shown**: Students can engage with their real identities

### 🔒 Anonymous Hub
- **Anonymous Posting**: Share thoughts without revealing identity
- **Admin Controls**: Toggle anonymous hub on/off
- **Reactions & Comments**: Full interaction support
- **Privacy Focused**: No user tracking in anonymous mode

### 🏆 Gamification
- **Points System**: Earn points for participation
- **Badges & Achievements**: Unlock badges for milestones
- **Leaderboards**: Course-specific and global rankings
- **Progress Tracking**: Visual progress indicators

### 📌 Pinned Posts
- **Global Announcements**: Important platform-wide updates
- **Course Announcements**: Course-specific pinned content
- **Admin Management**: Easy creation and management

### 🔔 Notifications
- **Real-time Updates**: Instant notifications for new content
- **Assignment Reminders**: Deadline notifications
- **Reaction Notifications**: Get notified of reactions to your posts
- **System Updates**: Platform-wide announcements

### 👥 User Management
- **Role-based Access**: Creator, Top Admin, Course Admin, User roles
- **User Banning**: Admin controls for user management
- **Profile Management**: Customizable user profiles
- **Security**: Secure authentication with Supabase

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Ubuntu Cloud  │    │   Supabase      │
│   (Frontend)    │◄──►│   (Backend API) │◄──►│   (Databases)   │
│   React + TS    │    │   Express.js    │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Radix UI for components
- React Query for data fetching
- Wouter for routing

**Backend:**
- Node.js with Express
- TypeScript for type safety
- Drizzle ORM for database operations
- JWT for authentication
- CORS for cross-origin requests

**Database:**
- Supabase (PostgreSQL)
- Row Level Security (RLS)
- Real-time subscriptions
- Multiple database instances

**Deployment:**
- Vercel for frontend hosting
- Ubuntu Cloud for backend
- Supabase for database hosting

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git
- Supabase account
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/yct-nd1-platform.git
   cd yct-nd1-platform
   ```

2. **Run the setup script**
   ```bash
   ./setup.sh
   ```
   Or manually:
   ```bash
   npm install
   cp env.example .env
   # Edit .env with your configuration
   npm run build
   ```

3. **Configure environment**
   - Copy `env.example` to `.env`
   - Fill in your Supabase credentials
   - Set up your database connections

4. **Set up databases**
   - Run `sql/main-database-setup.sql` in your main Supabase project
   - Run `sql/course-database-setup.sql` in each course Supabase project

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Visit the application**
   - Frontend: http://localhost:5000
   - Backend API: http://localhost:5000/api

## 📁 Project Structure

```
yct-nd1-platform/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── main.tsx       # Application entry point
│   └── index.html         # HTML template
├── server/                # Express backend
│   ├── auth.ts           # Authentication middleware
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   └── supabase.ts       # Supabase configuration
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schemas
├── sql/                  # Database setup scripts
│   ├── main-database-setup.sql
│   └── course-database-setup.sql
├── DEPLOYMENT-GUIDE.md   # Complete deployment guide
├── setup.sh             # Setup script
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

Key environment variables (see `env.example` for complete list):

```bash
# Main Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres

# Server Configuration
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://your-vercel-app.vercel.app
JWT_SECRET=your-jwt-secret

# Course Database Credentials
COURSE_1_URL=https://course-1-project-id.supabase.co
COURSE_1_ANON_KEY=course-1-anon-key
COURSE_1_SERVICE_KEY=course-1-service-key
```

### Database Setup

1. **Main Database**: Run `sql/main-database-setup.sql` in your main Supabase project
2. **Course Databases**: Run `sql/course-database-setup.sql` in each course Supabase project
3. **Permissions**: Ensure proper RLS policies are in place

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Configure environment variables
5. Deploy

### Backend (Ubuntu Cloud)

1. Set up Ubuntu server
2. Install Node.js and PM2
3. Clone repository and install dependencies
4. Configure environment variables
5. Build and start with PM2
6. Set up Nginx reverse proxy
7. Configure SSL with Let's Encrypt

### Database (Supabase)

1. Create main Supabase project
2. Run main database setup script
3. Create course Supabase projects
4. Run course database setup scripts
5. Configure RLS policies

For detailed deployment instructions, see [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md).

## 👥 User Roles

### Creator
- Ultimate admin with all permissions
- Cannot be removed or demoted
- Full platform control

### Top Admin (Executive)
- Platform-wide administrative access
- Can manage courses and users
- Can control anonymous hub
- Cannot remove creator

### Course Admin
- Course-specific administrative access
- Can manage course content
- Can create assignments and posts
- Assigned by Top Admins

### User (Student)
- Basic platform access
- Can view courses and participate
- Can post in discussions and anonymous hub
- Can complete assignments

## 🔒 Security Features

- **Authentication**: Secure JWT-based authentication
- **Authorization**: Role-based access control
- **Data Protection**: Row Level Security (RLS)
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API rate limiting
- **CORS**: Proper cross-origin configuration
- **HTTPS**: SSL/TLS encryption

## 📊 Monitoring & Analytics

- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: API response times
- **User Analytics**: Engagement metrics
- **Database Monitoring**: Query performance
- **Uptime Monitoring**: Service availability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check this README and DEPLOYMENT-GUIDE.md
- **Issues**: Create an issue in the GitHub repository
- **Discussions**: Use GitHub Discussions for questions

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Basic platform setup
- ✅ User authentication
- ✅ Course management
- ✅ Discussion system
- ✅ Anonymous hub
- ✅ Pinned posts

### Phase 2 (Planned)
- 🔄 Real-time notifications
- 🔄 Advanced gamification
- 🔄 Mobile app
- 🔄 Video integration
- 🔄 Advanced analytics

### Phase 3 (Future)
- 📋 AI-powered features
- 📋 Advanced collaboration tools
- 📋 Integration with external LMS
- 📋 Advanced reporting

## 🙏 Acknowledgments

- **Supabase** for the amazing backend-as-a-service platform
- **Vercel** for seamless frontend deployment
- **React** and **TypeScript** communities
- **Tailwind CSS** for the utility-first CSS framework
- **Radix UI** for accessible component primitives

---

**Built with ❤️ for YCT ND1 Computer Science students**

For questions or support, please contact: cs@yct.edu.ng
