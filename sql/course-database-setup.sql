-- ========================================
-- YCT ND1 COMPUTER SCIENCE - COURSE DATABASE SETUP
-- ========================================
-- This script sets up a course-specific Supabase database
-- Run this on each course's Supabase instance

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- POSTS TABLE (Assignments, Information, Announcements)
-- ========================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('assignment', 'post', 'announcement')),
    author_id UUID NOT NULL, -- References users.id from main DB
    deadline TIMESTAMP WITH TIME ZONE, -- For assignments
    media_urls TEXT[], -- Array of media file URLs
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================================
-- COMMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL, -- References users.id from main DB
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For nested comments
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================================
-- REACTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID NOT NULL, -- post_id or comment_id
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    user_id UUID NOT NULL, -- References users.id from main DB
    reaction_type TEXT NOT NULL, -- like, love, laugh, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(target_id, target_type, user_id) -- One reaction per user per target
);

-- ========================================
-- ASSIGNMENT STATUS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS assignment_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References users.id from main DB
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    submission_note TEXT,
    submission_files TEXT[], -- Array of submitted file URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(post_id, user_id) -- One status per user per assignment
);

-- ========================================
-- USER STATS TABLE (For Leaderboard)
-- ========================================
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References users.id from main DB
    posts_count INTEGER DEFAULT 0 NOT NULL,
    comments_count INTEGER DEFAULT 0 NOT NULL,
    reactions_received INTEGER DEFAULT 0 NOT NULL,
    assignments_completed INTEGER DEFAULT 0 NOT NULL,
    points INTEGER DEFAULT 0 NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id) -- One stats record per user per course
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_deadline ON posts(deadline);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON posts(is_deleted);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_is_deleted ON comments(is_deleted);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_reactions_target_id ON reactions(target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_target_type ON reactions(target_type);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_reaction_type ON reactions(reaction_type);

-- Assignment status indexes
CREATE INDEX IF NOT EXISTS idx_assignment_status_post_id ON assignment_status(post_id);
CREATE INDEX IF NOT EXISTS idx_assignment_status_user_id ON assignment_status(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_status_is_completed ON assignment_status(is_completed);

-- User stats indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_points ON user_stats(points);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_active ON user_stats(last_active);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Anyone can view non-deleted posts" ON posts
    FOR SELECT USING (is_deleted = false);

CREATE POLICY "Course admins can create posts" ON posts
    FOR INSERT WITH CHECK (true); -- Will be handled by application logic

CREATE POLICY "Course admins can update posts" ON posts
    FOR UPDATE USING (true); -- Will be handled by application logic

CREATE POLICY "Course admins can delete posts" ON posts
    FOR DELETE USING (true); -- Will be handled by application logic

-- Comments policies
CREATE POLICY "Anyone can view non-deleted comments" ON comments
    FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (auth.uid()::text = author_id::text);

CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (auth.uid()::text = author_id::text);

-- Reactions policies
CREATE POLICY "Anyone can view reactions" ON reactions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reactions" ON reactions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own reactions" ON reactions
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Assignment status policies
CREATE POLICY "Users can view their own assignment status" ON assignment_status
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own assignment status" ON assignment_status
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own assignment status" ON assignment_status
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- User stats policies
CREATE POLICY "Anyone can view user stats" ON user_stats
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own stats" ON user_stats
    FOR UPDATE USING (auth.uid()::text = user_id::text);

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
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_status_updated_at BEFORE UPDATE ON assignment_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user stats when posts are created
CREATE OR REPLACE FUNCTION update_user_stats_on_post()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
        INSERT INTO user_stats (user_id, posts_count, last_active)
        VALUES (NEW.author_id, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            posts_count = user_stats.posts_count + 1,
            last_active = NOW(),
            updated_at = NOW();
    ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
        UPDATE user_stats SET
            posts_count = GREATEST(0, posts_count - 1),
            updated_at = NOW()
        WHERE user_id = NEW.author_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update user stats when comments are created
CREATE OR REPLACE FUNCTION update_user_stats_on_comment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
        INSERT INTO user_stats (user_id, comments_count, last_active)
        VALUES (NEW.author_id, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            comments_count = user_stats.comments_count + 1,
            last_active = NOW(),
            updated_at = NOW();
    ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
        UPDATE user_stats SET
            comments_count = GREATEST(0, comments_count - 1),
            updated_at = NOW()
        WHERE user_id = NEW.author_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update user stats when reactions are received
CREATE OR REPLACE FUNCTION update_user_stats_on_reaction()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update reactions received for the target author
        IF NEW.target_type = 'post' THEN
            UPDATE user_stats SET
                reactions_received = reactions_received + 1,
                updated_at = NOW()
            WHERE user_id = (SELECT author_id FROM posts WHERE id = NEW.target_id);
        ELSIF NEW.target_type = 'comment' THEN
            UPDATE user_stats SET
                reactions_received = reactions_received + 1,
                updated_at = NOW()
            WHERE user_id = (SELECT author_id FROM comments WHERE id = NEW.target_id);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrease reactions received for the target author
        IF OLD.target_type = 'post' THEN
            UPDATE user_stats SET
                reactions_received = GREATEST(0, reactions_received - 1),
                updated_at = NOW()
            WHERE user_id = (SELECT author_id FROM posts WHERE id = OLD.target_id);
        ELSIF OLD.target_type = 'comment' THEN
            UPDATE user_stats SET
                reactions_received = GREATEST(0, reactions_received - 1),
                updated_at = NOW()
            WHERE user_id = (SELECT author_id FROM comments WHERE id = OLD.target_id);
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to update user stats when assignments are completed
CREATE OR REPLACE FUNCTION update_user_stats_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_completed = true THEN
        INSERT INTO user_stats (user_id, assignments_completed, last_active)
        VALUES (NEW.user_id, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            assignments_completed = user_stats.assignments_completed + 1,
            last_active = NOW(),
            updated_at = NOW();
    ELSIF TG_OP = 'UPDATE' AND OLD.is_completed = false AND NEW.is_completed = true THEN
        UPDATE user_stats SET
            assignments_completed = user_stats.assignments_completed + 1,
            last_active = NOW(),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_completed = true AND NEW.is_completed = false THEN
        UPDATE user_stats SET
            assignments_completed = GREATEST(0, assignments_completed - 1),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic stats updates
CREATE TRIGGER update_stats_on_post
    AFTER INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_post();

CREATE TRIGGER update_stats_on_comment
    AFTER INSERT OR UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_comment();

CREATE TRIGGER update_stats_on_reaction
    AFTER INSERT OR DELETE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_reaction();

CREATE TRIGGER update_stats_on_assignment
    AFTER INSERT OR UPDATE ON assignment_status
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_assignment();

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- View for posts with author information (will need to be joined with main DB)
CREATE VIEW posts_with_author AS
SELECT 
    p.*,
    'Unknown User' as author_username -- This will be populated by the application
FROM posts p
WHERE p.is_deleted = false;

-- View for comments with author information
CREATE VIEW comments_with_author AS
SELECT 
    c.*,
    'Unknown User' as author_username -- This will be populated by the application
FROM comments c
WHERE c.is_deleted = false;

-- View for assignment status with post information
CREATE VIEW assignment_status_with_post AS
SELECT 
    a.*,
    p.title as post_title,
    p.deadline as post_deadline,
    p.type as post_type
FROM assignment_status a
JOIN posts p ON a.post_id = p.id
WHERE p.is_deleted = false;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE posts IS 'Course posts including assignments, information, and announcements';
COMMENT ON TABLE comments IS 'Comments on posts with support for nested replies';
COMMENT ON TABLE reactions IS 'User reactions to posts and comments';
COMMENT ON TABLE assignment_status IS 'Student assignment completion tracking';
COMMENT ON TABLE user_stats IS 'User statistics for leaderboard and gamification';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'YCT ND1 Computer Science course database setup completed successfully!';
    RAISE NOTICE 'This database is ready for course-specific data.';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Add this database credentials to the main platform';
    RAISE NOTICE '2. Create course in the main platform with these credentials';
    RAISE NOTICE '3. Start adding course content and enrolling students';
END $$;