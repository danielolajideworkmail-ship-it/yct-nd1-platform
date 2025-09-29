import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Heart, 
  ThumbsUp, 
  Laugh, 
  AlertCircle, 
  Plus, 
  Settings,
  Eye,
  EyeOff,
  Clock,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AnonymousPost {
  id: string;
  content: string;
  reactions: {
    like: number;
    love: number;
    laugh: number;
  };
  userReaction?: string;
  createdAt: string;
  isPinned: boolean;
}

interface AnonymousComment {
  id: string;
  postId: string;
  content: string;
  reactions: {
    like: number;
    love: number;
    laugh: number;
  };
  userReaction?: string;
  createdAt: string;
}

export default function AnonymousHub() {
  const { user, isTopAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // Fetch anonymous hub settings
  const { data: settings = [] } = useQuery({
    queryKey: ['/api/settings'],
  });

  const anonymousHubEnabled = settings.find(s => s.key === 'anonymous_hub_enabled')?.value === true;

  // Fetch anonymous posts (mock data for now - will be replaced with real API)
  const { data: posts = [], isLoading: postsLoading } = useQuery<AnonymousPost[]>({
    queryKey: ['/api/anonymous/posts'],
    enabled: anonymousHubEnabled,
  });

  // Fetch comments for selected post
  const { data: comments = [] } = useQuery<AnonymousComment[]>({
    queryKey: ['/api/anonymous/posts', selectedPostId, 'comments'],
    enabled: !!selectedPostId && anonymousHubEnabled,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/anonymous/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to create post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anonymous/posts'] });
      setNewPostContent('');
      setIsCreateDialogOpen(false);
      toast({
        title: "Post created!",
        description: "Your anonymous post has been shared.",
      });
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const response = await fetch(`/api/anonymous/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to create comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anonymous/posts', selectedPostId, 'comments'] });
      setNewCommentContent('');
      toast({
        title: "Comment added!",
        description: "Your anonymous comment has been posted.",
      });
    },
  });

  // Reaction mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ targetId, targetType, reactionType }: { targetId: string; targetType: 'post' | 'comment'; reactionType: string }) => {
      const response = await fetch(`/api/anonymous/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, targetType, reactionType }),
      });
      if (!response.ok) throw new Error('Failed to add reaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anonymous/posts'] });
      if (selectedPostId) {
        queryClient.invalidateQueries({ queryKey: ['/api/anonymous/posts', selectedPostId, 'comments'] });
      }
    },
  });

  // Toggle anonymous hub mutation
  const toggleHubMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch('/api/settings/anonymous_hub_enabled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: enabled }),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings updated",
        description: `Anonymous Hub ${anonymousHubEnabled ? 'disabled' : 'enabled'}`,
      });
    },
  });

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    createPostMutation.mutate(newPostContent);
  };

  const handleCreateComment = () => {
    if (!newCommentContent.trim() || !selectedPostId) return;
    createCommentMutation.mutate({ postId: selectedPostId, content: newCommentContent });
  };

  const handleReaction = (targetId: string, targetType: 'post' | 'comment', reactionType: string) => {
    reactionMutation.mutate({ targetId, targetType, reactionType });
  };

  const handleToggleHub = () => {
    toggleHubMutation.mutate(!anonymousHubEnabled);
  };

  if (!anonymousHubEnabled) {
    return (
      <div className="space-y-6" data-testid="page-anonymous-hub">
        <div className="text-center py-12">
          <EyeOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Anonymous Hub is Disabled</h2>
          <p className="text-muted-foreground mb-6">
            The anonymous posting feature is currently turned off by administrators.
          </p>
          {isTopAdmin && (
            <Button onClick={() => setIsSettingsDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Enable Anonymous Hub
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-anonymous-hub">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Anonymous Hub
          </h1>
          <p className="text-muted-foreground mt-2">
            Share your thoughts anonymously with the community
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isTopAdmin && (
            <Button
              variant="outline"
              onClick={() => setIsSettingsDialogOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Posts</p>
                <p className="text-2xl font-bold">{posts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Active Today</p>
                <p className="text-2xl font-bold">
                  {posts.filter(p => 
                    new Date(p.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Total Reactions</p>
                <p className="text-2xl font-bold">
                  {posts.reduce((sum, post) => 
                    sum + post.reactions.like + post.reactions.love + post.reactions.laugh, 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {postsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to share something anonymously!
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className={post.isPinned ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">?</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Anonymous User</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {post.isPinned && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Pinned
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed mb-4">{post.content}</p>
                
                {/* Reactions */}
                <div className="flex items-center gap-4 mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction(post.id, 'post', 'like')}
                    className={post.userReaction === 'like' ? 'bg-blue-100 text-blue-700' : ''}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    {post.reactions.like}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction(post.id, 'post', 'love')}
                    className={post.userReaction === 'love' ? 'bg-red-100 text-red-700' : ''}
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    {post.reactions.love}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction(post.id, 'post', 'laugh')}
                    className={post.userReaction === 'laugh' ? 'bg-yellow-100 text-yellow-700' : ''}
                  >
                    <Laugh className="h-4 w-4 mr-1" />
                    {post.reactions.laugh}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPostId(selectedPostId === post.id ? null : post.id)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Comments
                  </Button>
                </div>

                {/* Comments Section */}
                {selectedPostId === post.id && (
                  <div className="border-t pt-4 space-y-4">
                    {/* Add Comment */}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add an anonymous comment..."
                        value={newCommentContent}
                        onChange={(e) => setNewCommentContent(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleCreateComment}
                        disabled={!newCommentContent.trim()}
                        size="sm"
                      >
                        Post
                      </Button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-gray-600">?</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{comment.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReaction(comment.id, 'comment', 'like')}
                                  className="h-6 px-2 text-xs"
                                >
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  {comment.reactions.like}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReaction(comment.id, 'comment', 'love')}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Heart className="h-3 w-3 mr-1" />
                                  {comment.reactions.love}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReaction(comment.id, 'comment', 'laugh')}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Laugh className="h-3 w-3 mr-1" />
                                  {comment.reactions.laugh}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Post Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Anonymous Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">What's on your mind?</Label>
              <Textarea
                id="content"
                placeholder="Share your thoughts anonymously..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || createPostMutation.isPending}
              >
                {createPostMutation.isPending ? 'Posting...' : 'Post Anonymously'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anonymous Hub Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enabled">Enable Anonymous Hub</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to post anonymously
                </p>
              </div>
              <Switch
                id="enabled"
                checked={anonymousHubEnabled}
                onCheckedChange={handleToggleHub}
                disabled={toggleHubMutation.isPending}
              />
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                When disabled, users won't be able to create new anonymous posts, 
                but existing posts will remain visible.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}