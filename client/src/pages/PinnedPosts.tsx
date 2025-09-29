import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Pin, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  User,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PinnedPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    username: string;
  };
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PinnedPosts() {
  const { user, isTopAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [editingPost, setEditingPost] = useState<PinnedPost | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch pinned posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<PinnedPost[]>({
    queryKey: ['/api/pinned'],
  });

  // Create pinned post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await fetch('/api/pinned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create pinned post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pinned'] });
      setNewPostTitle('');
      setNewPostContent('');
      setIsCreateDialogOpen(false);
      toast({
        title: "Pinned post created!",
        description: "Your announcement has been pinned.",
      });
    },
  });

  // Update pinned post mutation
  const updatePostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title: string; content: string; isPinned: boolean } }) => {
      const response = await fetch(`/api/pinned/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update pinned post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pinned'] });
      setEditingPost(null);
      setIsEditDialogOpen(false);
      toast({
        title: "Post updated!",
        description: "The pinned post has been updated.",
      });
    },
  });

  // Delete pinned post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/pinned/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete pinned post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pinned'] });
      toast({
        title: "Post deleted!",
        description: "The pinned post has been removed.",
      });
    },
  });

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    createPostMutation.mutate({
      title: newPostTitle,
      content: newPostContent,
    });
  };

  const handleEditPost = (post: PinnedPost) => {
    setEditingPost(post);
    setNewPostTitle(post.title);
    setNewPostContent(post.content);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePost = () => {
    if (!editingPost || !newPostTitle.trim() || !newPostContent.trim()) return;
    updatePostMutation.mutate({
      id: editingPost.id,
      data: {
        title: newPostTitle,
        content: newPostContent,
        isPinned: editingPost.isPinned,
      },
    });
  };

  const handleDeletePost = (id: string) => {
    if (window.confirm('Are you sure you want to delete this pinned post?')) {
      deletePostMutation.mutate(id);
    }
  };

  const handleTogglePin = (post: PinnedPost) => {
    updatePostMutation.mutate({
      id: post.id,
      data: {
        title: post.title,
        content: post.content,
        isPinned: !post.isPinned,
      },
    });
  };

  if (!isTopAdmin) {
    return (
      <div className="space-y-6" data-testid="page-pinned-posts">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            Only administrators can view and manage pinned posts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-pinned-posts">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Pin className="h-8 w-8" />
            Pinned Posts
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage important announcements and pinned content
          </p>
        </div>
        
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Pinned Post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Pin className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Pinned</p>
                <p className="text-2xl font-bold">{posts.filter(p => p.isPinned).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Active Posts</p>
                <p className="text-2xl font-bold">{posts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Recent</p>
                <p className="text-2xl font-bold">
                  {posts.filter(p => 
                    new Date(p.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
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
            <p className="mt-2 text-muted-foreground">Loading pinned posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Pin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pinned posts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first pinned post to share important announcements.
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
                            <Pin className="h-3 w-3 mr-1" />
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
                        {post.updatedAt !== post.createdAt && (
                          <>
                            <span>•</span>
                            <span>Updated {formatDistanceToNow(new Date(post.updatedAt), { addSuffix: true })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePin(post)}
                    >
                      <Pin className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPost(post)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{post.content}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Post Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Pinned Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter post title..."
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter post content..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="mt-1"
                rows={8}
              />
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This post will be automatically pinned and visible to all users.
              </AlertDescription>
            </Alert>
            
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
                {createPostMutation.isPending ? 'Creating...' : 'Create Pinned Post'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Pinned Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Enter post title..."
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                placeholder="Enter post content..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="mt-1"
                rows={8}
              />
            </div>
            
            {editingPost && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Switch
                    id="pin-status"
                    checked={editingPost.isPinned}
                    onCheckedChange={(checked) => setEditingPost({ ...editingPost, isPinned: checked })}
                  />
                  <Label htmlFor="pin-status">Pin this post</Label>
                </div>
                <Badge variant={editingPost.isPinned ? "default" : "secondary"}>
                  {editingPost.isPinned ? "Pinned" : "Unpinned"}
                </Badge>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePost}
                disabled={!newPostTitle.trim() || !newPostContent.trim() || updatePostMutation.isPending}
              >
                {updatePostMutation.isPending ? 'Updating...' : 'Update Post'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}