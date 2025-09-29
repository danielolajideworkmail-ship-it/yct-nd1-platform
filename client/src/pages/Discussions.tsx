import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Heart, 
  ThumbsUp, 
  Laugh, 
  Plus, 
  Search,
  Clock,
  User,
  Award,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DiscussionPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  course?: {
    id: string;
    name: string;
  };
  reactions: {
    like: number;
    love: number;
    laugh: number;
  };
  userReaction?: string;
  commentsCount: number;
  createdAt: string;
  isPinned: boolean;
  tags: string[];
}

export default function Discussions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCourse, setNewPostCourse] = useState('');
  const [newPostTags, setNewPostTags] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch courses for filtering
  const { data: courses = [] } = useQuery({
    queryKey: ['/api/courses'],
  });

  // Fetch discussion posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<DiscussionPost[]>({
    queryKey: ['/api/discussions/posts', { search: searchQuery, course: selectedCourse, sort: sortBy }],
  });

  // Fetch global leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['/api/leaderboard'],
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; courseId?: string; tags: string[] }) => {
      const response = await fetch('/api/discussions/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discussions/posts'] });
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCourse('');
      setNewPostTags('');
      setIsCreateDialogOpen(false);
      toast({
        title: "Discussion created!",
        description: "Your discussion post has been shared.",
      });
    },
  });

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    
    const tags = newPostTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    createPostMutation.mutate({
      title: newPostTitle,
      content: newPostContent,
      courseId: newPostCourse || undefined,
      tags,
    });
  };

  const filteredPosts = posts.filter(post => {
    if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !post.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCourse !== 'all' && post.course?.id !== selectedCourse) {
      return false;
    }
    return true;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'popular':
        return (b.reactions.like + b.reactions.love + b.reactions.laugh) - 
               (a.reactions.like + a.reactions.love + a.reactions.laugh);
      case 'comments':
        return b.commentsCount - a.commentsCount;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6" data-testid="page-discussions">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Discussions
          </h1>
          <p className="text-muted-foreground mt-2">
            Engage with your peers in open discussions
          </p>
        </div>
        
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Discussion
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search discussions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="comments">Most Comments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Posts */}
          <div className="space-y-4">
            {postsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading discussions...</p>
              </div>
            ) : sortedPosts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No discussions found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Try adjusting your search terms' : 'Be the first to start a discussion!'}
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start Discussion
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sortedPosts.map((post) => (
                <Card key={post.id} className={post.isPinned ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{post.title}</h3>
                            {post.isPinned && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                Pinned
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>by {post.author.username}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </span>
                            {post.course && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {post.course.name}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-sm leading-relaxed mb-4">{post.content}</p>
                    
                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Reactions and Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {post.reactions.like}
                        </Button>
                        
                        <Button variant="ghost" size="sm">
                          <Heart className="h-4 w-4 mr-1" />
                          {post.reactions.love}
                        </Button>
                        
                        <Button variant="ghost" size="sm">
                          <Laugh className="h-4 w-4 mr-1" />
                          {post.reactions.laugh}
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPostId(selectedPostId === post.id ? null : post.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {post.commentsCount} Comments
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Top Contributors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((user, index) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.points} points</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {user.badges} badges
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Posts</span>
                  <span className="text-sm font-medium">{posts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Your Posts</span>
                  <span className="text-sm font-medium">
                    {posts.filter(p => p.author.id === user?.id).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Post Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start a Discussion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What's your discussion about?"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Share your thoughts, ask questions, or start a conversation..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="mt-1"
                rows={6}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course">Course (Optional)</Label>
                <Select value={newPostCourse} onValueChange={setNewPostCourse}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific course</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="tags">Tags (Optional)</Label>
                <Input
                  id="tags"
                  placeholder="tag1, tag2, tag3"
                  value={newPostTags}
                  onChange={(e) => setNewPostTags(e.target.value)}
                  className="mt-1"
                />
              </div>
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
                disabled={!newPostTitle.trim() || !newPostContent.trim() || createPostMutation.isPending}
              >
                {createPostMutation.isPending ? 'Creating...' : 'Create Discussion'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}