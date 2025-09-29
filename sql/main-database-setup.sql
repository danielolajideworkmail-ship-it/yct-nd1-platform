-- ========================================
-- YCT ND1 COMPUTER SCIENCE - MAIN DATABASE SETUP
-- ========================================
-- This script sets up the main Supabase database for the platform
-- Run this on your main Supabase instance

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email TEXT NOT NULL,
    is_creator BOOLEAN DEFAULT FALSE NOT NULL,
    is_banned BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================================
-- ROLES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('creator', 'top_admin', 'course_admin', 'user')),
    scope UUID, -- null for global roles, course_id for course-specific roles
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================================
-- COURSES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    lecturer TEXT,
    course_rep TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================================
-- COURSE CREDENTIALS TABLE (SENSITIVE DATA)
-- ========================================
CREATE TABLE IF NOT EXISTS course_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE UNIQUE,
    supabase_url TEXT NOT NULL,
    supabase_anon_key TEXT NOT NULL,
    supabase_service_key TEXT NOT NULL, -- Should be encrypted in production
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================================
-- COURSE MEMBERSHIPS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS course_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'student' NOT NULL CHECK (role IN ('student', 'course_admin')),
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'suspended')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, course_id)
);

-- ========================================
-- PLATFORM SETTINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================================
-- NOTIFICATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- assignment, post, reaction, system, etc.
    data JSONB, -- Additional data (course_id, post_id, etc.)
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================================
-- GLOBAL PINNED POSTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS global_pinned_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author UUID NOT NULL REFERENCES users(id),
    is_pinned BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================================
-- USER BADGES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL, -- first_post, top_contributor, etc.
    badge_data JSONB, -- Additional badge metadata
    course_id UUID, -- null for global badges, course_id for course-specific
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_creator ON users(is_creator);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_user_id ON roles(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_role_type ON roles(role_type);
CREATE INDEX IF NOT EXISTS idx_roles_scope ON roles(scope);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON courses(is_active);

-- Course memberships indexes
CREATE INDEX IF NOT EXISTS idx_course_memberships_user_id ON course_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_course_memberships_course_id ON course_memberships(course_id);
CREATE INDEX IF NOT EXISTS idx_course_memberships_status ON course_memberships(status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Global pinned posts indexes
CREATE INDEX IF NOT EXISTS idx_global_pinned_posts_is_pinned ON global_pinned_posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_global_pinned_posts_created_at ON global_pinned_posts(created_at);

-- User badges indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_course_id ON user_badges(course_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_pinned_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Roles policies
CREATE POLICY "Users can view their own roles" ON roles
    FOR SELECT USING (auth.uid() = user_id);

-- Courses policies
CREATE POLICY "Users can view active courses" ON courses
    FOR SELECT USING (is_active = true);

-- Course memberships policies
CREATE POLICY "Users can view their own memberships" ON course_memberships
    FOR SELECT USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Global pinned posts policies
CREATE POLICY "Anyone can view pinned posts" ON global_pinned_posts
    FOR SELECT USING (is_pinned = true);

-- User badges policies
CREATE POLICY "Users can view their own badges" ON user_badges
    FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_credentials_updated_at BEFORE UPDATE ON course_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_pinned_posts_updated_at BEFORE UPDATE ON global_pinned_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- INITIAL DATA SETUP
-- ========================================

-- Insert default platform settings
INSERT INTO platform_settings (key, value, updated_by) VALUES
    ('platform_name', '"YCT ND1 Computer Science"', (SELECT id FROM users WHERE is_creator = true LIMIT 1)),
    ('anonymous_hub_enabled', 'true', (SELECT id FROM users WHERE is_creator = true LIMIT 1)),
    ('max_courses_per_user', '10', (SELECT id FROM users WHERE is_creator = true LIMIT 1)),
    ('points_per_post', '10', (SELECT id FROM users WHERE is_creator = true LIMIT 1)),
    ('points_per_comment', '5', (SELECT id FROM users WHERE is_creator = true LIMIT 1)),
    ('points_per_reaction', '1', (SELECT id FROM users WHERE is_creator = true LIMIT 1)),
    ('points_per_assignment_completion', '20', (SELECT id FROM users WHERE is_creator = true LIMIT 1))
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE users IS 'Main users table linked to Supabase Auth';
COMMENT ON TABLE roles IS 'Role-based access control for the platform';
COMMENT ON TABLE courses IS 'Course registry with public information only';
COMMENT ON TABLE course_credentials IS 'Sensitive course database credentials (service role only)';
COMMENT ON TABLE course_memberships IS 'User enrollments in courses';
COMMENT ON TABLE platform_settings IS 'Global platform configuration';
COMMENT ON TABLE notifications IS 'User notifications system';
COMMENT ON TABLE global_pinned_posts IS 'Cross-platform announcements and pinned content';
COMMENT ON TABLE user_badges IS 'Gamification badges and achievements';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'YCT ND1 Computer Science main database setup completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create your creator account in Supabase Auth';
    RAISE NOTICE '2. Update the creator user in the users table: UPDATE users SET is_creator = true WHERE email = ''your-email@example.com'';';
    RAISE NOTICE '3. Run the course database setup script for each course';
    RAISE NOTICE '4. Configure your environment variables';
END $$;