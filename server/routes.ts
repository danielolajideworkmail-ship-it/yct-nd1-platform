import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { requireAuth, optionalAuth, requireRole, requireCourseAdmin, type AuthenticatedRequest } from "./auth";
import { 
  createCourseSchema,
  assignRoleSchema,
  updateSettingSchema,
  createPostSchema,
  createCommentSchema,
  createReactionSchema,
  type CreateCourseRequest,
  type AssignRoleRequest,
  type UpdateSettingRequest,
  type CreatePostRequest,
  type CreateCommentRequest,
  type CreateReactionRequest
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ========================================
  // USER PROFILE ROUTES
  // ========================================

  // Get current user (works with Supabase token)
  app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const roles = await storage.getUserRoles(user.id);
      const memberships = await storage.getCourseMemberships(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isCreator: user.isCreator,
        },
        roles,
        memberships,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user data" });
    }
  });

  // Update user profile
  app.put("/api/auth/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { username } = req.body;
      
      if (!username || username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      const updatedUser = await storage.updateUser(req.user!.id, { username });
      
      res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          isCreator: updatedUser.isCreator,
        }
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // ========================================
  // COURSE MANAGEMENT ROUTES
  // ========================================

  // Get all courses (for enrolled users)
  app.get("/api/courses", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const courses = await storage.getCourses();
      
      // Filter courses based on user membership (unless they're top admin)
      if (!req.user!.isCreator) {
        const userRoles = await storage.getUserRoles(req.user!.id);
        const isTopAdmin = userRoles.some(role => role.roleType === 'top_admin');
        
        if (!isTopAdmin) {
          const memberships = await storage.getCourseMemberships(req.user!.id);
          const enrolledCourseIds = memberships.map(m => m.courseId);
          const filteredCourses = courses.filter(course => enrolledCourseIds.includes(course.id));
          return res.json(filteredCourses);
        }
      }

      res.json(courses);
    } catch (error) {
      console.error("Get courses error:", error);
      res.status(500).json({ error: "Failed to get courses" });
    }
  });

  // Create new course (top admins only)
  app.post("/api/courses", requireAuth, requireRole(['creator', 'top_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const data = createCourseSchema.parse(req.body) as CreateCourseRequest;

      // Create course
      const course = await storage.createCourse({
        name: data.name,
        description: data.description,
        lecturer: data.lecturer,
        courseRep: data.courseRep,
        createdBy: req.user!.id,
      });

      // Store course credentials securely
      await storage.createCourseCredentials({
        courseId: course.id,
        supabaseUrl: data.supabaseUrl,
        supabaseAnonKey: data.supabaseAnonKey,
        supabaseServiceKey: data.supabaseServiceKey, // Should be encrypted in production
      });

      res.status(201).json(course);
    } catch (error) {
      console.error("Create course error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data" });
      }
      res.status(500).json({ error: "Failed to create course" });
    }
  });

  // Get course details
  app.get("/api/courses/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const course = await storage.getCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Check if user has access to this course
      if (!req.user!.isCreator) {
        const userRoles = await storage.getUserRoles(req.user!.id);
        const isTopAdmin = userRoles.some(role => role.roleType === 'top_admin');
        
        if (!isTopAdmin) {
          const memberships = await storage.getCourseMemberships(req.user!.id);
          const hasAccess = memberships.some(m => m.courseId === course.id && m.status === 'active');
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Access denied to this course" });
          }
        }
      }

      res.json(course);
    } catch (error) {
      console.error("Get course error:", error);
      res.status(500).json({ error: "Failed to get course" });
    }
  });

  // ========================================
  // ROLE MANAGEMENT ROUTES
  // ========================================

  // Assign role to user (creator and top admins only)
  app.post("/api/roles/assign", requireAuth, requireRole(['creator', 'top_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const data = assignRoleSchema.parse(req.body) as AssignRoleRequest;

      // Prevent removal of creator
      if (data.roleType === 'user') {
        const targetUser = await storage.getUserById(data.userId);
        if (targetUser?.isCreator) {
          return res.status(400).json({ error: "Cannot demote the creator" });
        }
      }

      // Create role
      const role = await storage.createRole({
        userId: data.userId,
        roleType: data.roleType,
        scope: data.scope,
        assignedBy: req.user!.id,
      });

      res.status(201).json(role);
    } catch (error) {
      console.error("Assign role error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data" });
      }
      res.status(500).json({ error: "Failed to assign role" });
    }
  });

  // ========================================
  // PLATFORM SETTINGS ROUTES
  // ========================================

  // Get platform settings
  app.get("/api/settings", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await storage.getAllSettings();
      
      // Return public settings or all settings for admins
      if (!req.user) {
        // Public settings only
        const publicSettings = settings.filter(s => 
          ['platform_name', 'anonymous_hub_enabled'].includes(s.key)
        );
        return res.json(publicSettings);
      }

      res.json(settings);
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  // Update platform setting (top admins only)
  app.put("/api/settings/:key", requireAuth, requireRole(['creator', 'top_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const data = updateSettingSchema.parse(req.body) as UpdateSettingRequest;

      const setting = await storage.updateSetting(req.params.key, data.value, req.user!.id);
      res.json(setting);
    } catch (error) {
      console.error("Update setting error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data" });
      }
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // ========================================
  // NOTIFICATION ROUTES
  // ========================================

  // Get user notifications
  app.get("/api/notifications", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      res.json(notification);
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // ========================================
  // GLOBAL PINNED POSTS ROUTES
  // ========================================

  // Get global pinned posts
  app.get("/api/pinned", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const posts = await storage.getGlobalPinnedPosts();
      res.json(posts);
    } catch (error) {
      console.error("Get pinned posts error:", error);
      res.status(500).json({ error: "Failed to get pinned posts" });
    }
  });

  // Create global pinned post (top admins only)
  app.post("/api/pinned", requireAuth, requireRole(['creator', 'top_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const post = await storage.createGlobalPinnedPost({
        title,
        content,
        author: req.user!.id
      });

      res.status(201).json(post);
    } catch (error) {
      console.error("Create pinned post error:", error);
      res.status(500).json({ error: "Failed to create pinned post" });
    }
  });

  // Update global pinned post (top admins only)
  app.put("/api/pinned/:id", requireAuth, requireRole(['creator', 'top_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { title, content, isPinned } = req.body;
      
      const post = await storage.updateGlobalPinnedPost(req.params.id, {
        title,
        content,
        isPinned
      });

      res.json(post);
    } catch (error) {
      console.error("Update pinned post error:", error);
      res.status(500).json({ error: "Failed to update pinned post" });
    }
  });

  // Delete global pinned post (top admins only)
  app.delete("/api/pinned/:id", requireAuth, requireRole(['creator', 'top_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteGlobalPinnedPost(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete pinned post error:", error);
      res.status(500).json({ error: "Failed to delete pinned post" });
    }
  });

  // ========================================
  // COURSE POSTS ROUTES
  // ========================================

  // Get course posts
  app.get("/api/courses/:courseId/posts", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Check course access
      const course = await storage.getCourseById(req.params.courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Verify membership
      if (!req.user!.isCreator) {
        const userRoles = await storage.getUserRoles(req.user!.id);
        const isTopAdmin = userRoles.some(role => role.roleType === 'top_admin');
        
        if (!isTopAdmin) {
          const memberships = await storage.getCourseMemberships(req.user!.id);
          const hasAccess = memberships.some(m => m.courseId === course.id && m.status === 'active');
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Access denied to this course" });
          }
        }
      }

      const posts = await storage.getCoursePosts(req.params.courseId);
      res.json(posts);
    } catch (error) {
      console.error("Get course posts error:", error);
      res.status(500).json({ error: "Failed to get course posts" });
    }
  });

  // Create course post
  app.post("/api/courses/:courseId/posts", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const data = createPostSchema.parse(req.body) as CreatePostRequest;
      
      // Check if user is course admin for this course
      const userRoles = await storage.getUserRoles(req.user!.id);
      const isCourseAdmin = userRoles.some(role => 
        (role.roleType === 'course_admin' && role.scope === req.params.courseId) ||
        role.roleType === 'creator' ||
        role.roleType === 'top_admin'
      );
      
      if (!isCourseAdmin) {
        return res.status(403).json({ error: "Only course admins can create posts" });
      }

      const post = await storage.createCoursePost(req.params.courseId, {
        title: data.title,
        content: data.content,
        type: data.type,
        authorId: req.user!.id,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        mediaUrls: data.mediaUrls
      });

      if (!post) {
        return res.status(500).json({ error: "Failed to create post in course database" });
      }

      res.status(201).json(post);
    } catch (error) {
      console.error("Create course post error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data" });
      }
      res.status(500).json({ error: "Failed to create course post" });
    }
  });

  // Get single course post
  app.get("/api/courses/:courseId/posts/:postId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const post = await storage.getCoursePostById(req.params.courseId, req.params.postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Get course post error:", error);
      res.status(500).json({ error: "Failed to get course post" });
    }
  });

  // ========================================
  // COURSE COMMENTS ROUTES
  // ========================================

  // Get course post comments
  app.get("/api/courses/:courseId/posts/:postId/comments", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const comments = await storage.getCourseComments(req.params.courseId, req.params.postId);
      res.json(comments);
    } catch (error) {
      console.error("Get course comments error:", error);
      res.status(500).json({ error: "Failed to get course comments" });
    }
  });

  // Create course comment
  app.post("/api/courses/:courseId/comments", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const data = createCommentSchema.parse(req.body) as CreateCommentRequest;

      const comment = await storage.createCourseComment(req.params.courseId, {
        postId: data.postId,
        authorId: req.user!.id,
        content: data.content,
        parentId: data.parentId
      });

      if (!comment) {
        return res.status(500).json({ error: "Failed to create comment in course database" });
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error("Create course comment error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data" });
      }
      res.status(500).json({ error: "Failed to create course comment" });
    }
  });

  // ========================================
  // COURSE REACTIONS ROUTES
  // ========================================

  // Get reactions for target (post or comment)
  app.get("/api/courses/:courseId/reactions/:targetType/:targetId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const reactions = await storage.getCourseReactions(req.params.courseId, req.params.targetId, req.params.targetType);
      res.json(reactions);
    } catch (error) {
      console.error("Get course reactions error:", error);
      res.status(500).json({ error: "Failed to get course reactions" });
    }
  });

  // Create or update reaction
  app.post("/api/courses/:courseId/reactions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const data = createReactionSchema.parse(req.body) as CreateReactionRequest;

      const reaction = await storage.createCourseReaction(req.params.courseId, {
        targetId: data.targetId,
        targetType: data.targetType,
        userId: req.user!.id,
        reactionType: data.reactionType
      });

      if (!reaction) {
        return res.status(500).json({ error: "Failed to create reaction in course database" });
      }

      res.status(201).json(reaction);
    } catch (error) {
      console.error("Create course reaction error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data" });
      }
      res.status(500).json({ error: "Failed to create course reaction" });
    }
  });

  // ========================================
  // ASSIGNMENT STATUS ROUTES
  // ========================================

  // Get assignment status for user
  app.get("/api/courses/:courseId/assignments/:postId/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const status = await storage.getAssignmentStatus(req.params.courseId, req.params.postId, req.user!.id);
      res.json(status);
    } catch (error) {
      console.error("Get assignment status error:", error);
      res.status(500).json({ error: "Failed to get assignment status" });
    }
  });

  // Update assignment status (mark as complete)
  app.post("/api/courses/:courseId/assignments/:postId/complete", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { submissionNote } = req.body;
      
      // Check if status already exists
      const existingStatus = await storage.getAssignmentStatus(req.params.courseId, req.params.postId, req.user!.id);
      
      if (existingStatus) {
        // Update existing status
        const updatedStatus = await storage.updateAssignmentStatus(req.params.courseId, existingStatus.id, {
          isCompleted: true,
          completedAt: new Date(),
          submissionNote
        });
        res.json(updatedStatus);
      } else {
        // Create new status
        const newStatus = await storage.createAssignmentStatus(req.params.courseId, {
          postId: req.params.postId,
          userId: req.user!.id,
          isCompleted: true,
          completedAt: new Date(),
          submissionNote
        });
        res.status(201).json(newStatus);
      }
    } catch (error) {
      console.error("Update assignment status error:", error);
      res.status(500).json({ error: "Failed to update assignment status" });
    }
  });

  // ========================================
  // COURSE LEADERBOARD ROUTES
  // ========================================

  // Get course leaderboard
  app.get("/api/courses/:courseId/leaderboard", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const leaderboard = await storage.getCourseLeaderboard(req.params.courseId);
      res.json(leaderboard);
    } catch (error) {
      console.error("Get course leaderboard error:", error);
      res.status(500).json({ error: "Failed to get course leaderboard" });
    }
  });

  // Dashboard aggregation endpoints
  app.get("/api/dashboard/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getUserDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/dashboard/assignments", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const assignments = await storage.getAllUserAssignments(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Get user assignments error:", error);
      res.status(500).json({ error: "Failed to get user assignments" });
    }
  });

  // Global leaderboard endpoint
  app.get("/api/leaderboard", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const leaderboard = await storage.getGlobalLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // Assignment completion endpoints
  app.put("/api/assignments/:postId/complete", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { postId } = req.params;
      const { courseId, isCompleted, submissionText } = req.body;
      const userId = req.user!.id;

      // Check if status exists, if not create it
      let status = await storage.getAssignmentStatus(courseId, postId, userId);
      
      if (status) {
        // Update existing status
        status = await storage.updateAssignmentStatus(courseId, status.id, {
          isCompleted,
          submissionText,
          completedAt: isCompleted ? new Date() : null,
        });
      } else {
        // Create new status
        status = await storage.createAssignmentStatus(courseId, {
          id: crypto.randomUUID(),
          postId,
          userId,
          isCompleted,
          submissionText: submissionText || null,
          submissionFiles: [],
          completedAt: isCompleted ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      res.json(status);
    } catch (error) {
      console.error("Update assignment completion error:", error);
      res.status(500).json({ error: "Failed to update assignment completion" });
    }
  });

  // ========================================
  // ANONYMOUS HUB ROUTES
  // ========================================

  // Get anonymous posts
  app.get("/api/anonymous/posts", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Check if anonymous hub is enabled
      const settings = await storage.getAllSettings();
      const anonymousHubEnabled = settings.find(s => s.key === 'anonymous_hub_enabled')?.value === true;
      
      if (!anonymousHubEnabled) {
        return res.json([]);
      }

      // For now, return mock data - will be replaced with real database
      const mockPosts = [
        {
          id: "1",
          content: "This is a sample anonymous post. Users can share their thoughts without revealing their identity.",
          reactions: { like: 5, love: 2, laugh: 1 },
          userReaction: undefined,
          createdAt: new Date().toISOString(),
          isPinned: false,
        },
        {
          id: "2", 
          content: "Another anonymous post to demonstrate the feature. This could be about anything!",
          reactions: { like: 3, love: 0, laugh: 2 },
          userReaction: undefined,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          isPinned: true,
        }
      ];
      
      res.json(mockPosts);
    } catch (error) {
      console.error("Get anonymous posts error:", error);
      res.status(500).json({ error: "Failed to get anonymous posts" });
    }
  });

  // Create anonymous post
  app.post("/api/anonymous/posts", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      // Check if anonymous hub is enabled
      const settings = await storage.getAllSettings();
      const anonymousHubEnabled = settings.find(s => s.key === 'anonymous_hub_enabled')?.value === true;
      
      if (!anonymousHubEnabled) {
        return res.status(403).json({ error: "Anonymous hub is disabled" });
      }

      // For now, return mock response - will be replaced with real database
      const newPost = {
        id: crypto.randomUUID(),
        content: content.trim(),
        reactions: { like: 0, love: 0, laugh: 0 },
        userReaction: undefined,
        createdAt: new Date().toISOString(),
        isPinned: false,
      };
      
      res.status(201).json(newPost);
    } catch (error) {
      console.error("Create anonymous post error:", error);
      res.status(500).json({ error: "Failed to create anonymous post" });
    }
  });

  // Get anonymous post comments
  app.get("/api/anonymous/posts/:postId/comments", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // For now, return mock data - will be replaced with real database
      const mockComments = [
        {
          id: "1",
          postId: req.params.postId,
          content: "This is a sample anonymous comment.",
          reactions: { like: 2, love: 0, laugh: 0 },
          userReaction: undefined,
          createdAt: new Date().toISOString(),
        }
      ];
      
      res.json(mockComments);
    } catch (error) {
      console.error("Get anonymous comments error:", error);
      res.status(500).json({ error: "Failed to get anonymous comments" });
    }
  });

  // Create anonymous comment
  app.post("/api/anonymous/posts/:postId/comments", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      // Check if anonymous hub is enabled
      const settings = await storage.getAllSettings();
      const anonymousHubEnabled = settings.find(s => s.key === 'anonymous_hub_enabled')?.value === true;
      
      if (!anonymousHubEnabled) {
        return res.status(403).json({ error: "Anonymous hub is disabled" });
      }

      // For now, return mock response - will be replaced with real database
      const newComment = {
        id: crypto.randomUUID(),
        postId: req.params.postId,
        content: content.trim(),
        reactions: { like: 0, love: 0, laugh: 0 },
        userReaction: undefined,
        createdAt: new Date().toISOString(),
      };
      
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Create anonymous comment error:", error);
      res.status(500).json({ error: "Failed to create anonymous comment" });
    }
  });

  // Create anonymous reaction
  app.post("/api/anonymous/reactions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { targetId, targetType, reactionType } = req.body;
      
      if (!targetId || !targetType || !reactionType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // For now, return mock response - will be replaced with real database
      const newReaction = {
        id: crypto.randomUUID(),
        targetId,
        targetType,
        userId: req.user!.id,
        reactionType,
        createdAt: new Date().toISOString(),
      };
      
      res.status(201).json(newReaction);
    } catch (error) {
      console.error("Create anonymous reaction error:", error);
      res.status(500).json({ error: "Failed to create reaction" });
    }
  });

  // ========================================
  // DISCUSSIONS ROUTES
  // ========================================

  // Get discussion posts
  app.get("/api/discussions/posts", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { search, course, sort } = req.query;
      
      // For now, return mock data - will be replaced with real database
      const mockPosts = [
        {
          id: "1",
          title: "Welcome to YCT ND1 Computer Science!",
          content: "This is a sample discussion post. Students can engage in open discussions here.",
          author: {
            id: req.user!.id,
            username: req.user!.username,
          },
          course: {
            id: "1",
            name: "Introduction to Programming",
          },
          reactions: { like: 8, love: 3, laugh: 1 },
          userReaction: undefined,
          commentsCount: 5,
          createdAt: new Date().toISOString(),
          isPinned: true,
          tags: ["welcome", "introduction"],
        },
        {
          id: "2",
          title: "Best practices for coding assignments",
          content: "What are some tips you've found helpful when working on coding assignments?",
          author: {
            id: "2",
            username: "Student123",
          },
          course: {
            id: "1", 
            name: "Introduction to Programming",
          },
          reactions: { like: 12, love: 2, laugh: 0 },
          userReaction: undefined,
          commentsCount: 8,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          isPinned: false,
          tags: ["coding", "assignments", "tips"],
        }
      ];
      
      res.json(mockPosts);
    } catch (error) {
      console.error("Get discussion posts error:", error);
      res.status(500).json({ error: "Failed to get discussion posts" });
    }
  });

  // Create discussion post
  app.post("/api/discussions/posts", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { title, content, courseId, tags } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      // For now, return mock response - will be replaced with real database
      const newPost = {
        id: crypto.randomUUID(),
        title: title.trim(),
        content: content.trim(),
        author: {
          id: req.user!.id,
          username: req.user!.username,
        },
        course: courseId ? { id: courseId, name: "Course Name" } : undefined,
        reactions: { like: 0, love: 0, laugh: 0 },
        userReaction: undefined,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        isPinned: false,
        tags: tags || [],
      };
      
      res.status(201).json(newPost);
    } catch (error) {
      console.error("Create discussion post error:", error);
      res.status(500).json({ error: "Failed to create discussion post" });
    }
  });

  // Get discussion post comments
  app.get("/api/discussions/posts/:postId/comments", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // For now, return mock data - will be replaced with real database
      const mockComments = [
        {
          id: "1",
          postId: req.params.postId,
          content: "This is a sample discussion comment.",
          author: {
            id: "2",
            username: "Student123",
          },
          reactions: { like: 3, love: 0, laugh: 0 },
          userReaction: undefined,
          createdAt: new Date().toISOString(),
        }
      ];
      
      res.json(mockComments);
    } catch (error) {
      console.error("Get discussion comments error:", error);
      res.status(500).json({ error: "Failed to get discussion comments" });
    }
  });

  // Create discussion comment
  app.post("/api/discussions/posts/:postId/comments", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { content, parentId } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      // For now, return mock response - will be replaced with real database
      const newComment = {
        id: crypto.randomUUID(),
        postId: req.params.postId,
        content: content.trim(),
        author: {
          id: req.user!.id,
          username: req.user!.username,
        },
        reactions: { like: 0, love: 0, laugh: 0 },
        userReaction: undefined,
        createdAt: new Date().toISOString(),
        parentId,
      };
      
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Create discussion comment error:", error);
      res.status(500).json({ error: "Failed to create discussion comment" });
    }
  });

  // Create discussion reaction
  app.post("/api/discussions/reactions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { targetId, targetType, reactionType } = req.body;
      
      if (!targetId || !targetType || !reactionType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // For now, return mock response - will be replaced with real database
      const newReaction = {
        id: crypto.randomUUID(),
        targetId,
        targetType,
        userId: req.user!.id,
        reactionType,
        createdAt: new Date().toISOString(),
      };
      
      res.status(201).json(newReaction);
    } catch (error) {
      console.error("Create discussion reaction error:", error);
      res.status(500).json({ error: "Failed to create reaction" });
    }
  });

  // ========================================
  // USER MANAGEMENT ROUTES (ADMIN)
  // ========================================

  // Get all users (top admins only)
  app.get("/api/admin/users", requireAuth, requireRole(['creator', 'top_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Get roles for each user
      const usersWithRoles = await Promise.all(users.map(async (user) => {
        const roles = await storage.getUserRoles(user.id);
        return { ...user, roles };
      }));
      
      res.json(usersWithRoles);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  // Ban user (top admins only)
  app.post("/api/admin/users/:userId/ban", requireAuth, requireRole(['creator', 'top_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const targetUser = await storage.getUserById(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (targetUser.isCreator) {
        return res.status(400).json({ error: "Cannot ban the creator" });
      }

      await storage.banUser(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Ban user error:", error);
      res.status(500).json({ error: "Failed to ban user" });
    }
  });

  // Unban user (top admins only)
  app.post("/api/admin/users/:userId/unban", requireAuth, requireRole(['creator', 'top_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      await storage.unbanUser(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Unban user error:", error);
      res.status(500).json({ error: "Failed to unban user" });
    }
  });

  // Add user to course
  app.post("/api/admin/courses/:courseId/members", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, role = 'student' } = req.body;
      
      // Check if user is authorized to add members
      const userRoles = await storage.getUserRoles(req.user!.id);
      const canAddMembers = userRoles.some(r => 
        r.roleType === 'creator' ||
        r.roleType === 'top_admin' ||
        (r.roleType === 'course_admin' && r.scope === req.params.courseId)
      );
      
      if (!canAddMembers) {
        return res.status(403).json({ error: "Not authorized to add course members" });
      }

      const membership = await storage.createCourseMembership({
        userId,
        courseId: req.params.courseId,
        role
      });

      res.status(201).json(membership);
    } catch (error) {
      console.error("Add course member error:", error);
      res.status(500).json({ error: "Failed to add course member" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}