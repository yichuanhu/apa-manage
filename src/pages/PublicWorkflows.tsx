import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Video, FileText, Eye } from 'lucide-react';

interface Workflow {
  id: string;
  title: string;
  description: string | null;
  video_path: string | null;
  video_size: number | null;
  markdown_content: string | null;
  created_at: string;
}

export default function PublicWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const fetchPublicWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('id, title, description, video_path, video_size, markdown_content, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error fetching public workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicWorkflows();
  }, []);

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openViewDialog = async (workflow: Workflow) => {
    setSelectedWorkflow(workflow);

    // 获取视频URL
    if (workflow.video_path) {
      const { data } = supabase.storage.from('workflows').getPublicUrl(workflow.video_path);
      setVideoUrl(data.publicUrl);
    } else {
      setVideoUrl(null);
    }

    setIsViewDialogOpen(true);
  };

  const filteredWorkflows = workflows.filter(
    (workflow) =>
      workflow.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workflow.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">流程文档</h1>
          <p className="text-muted-foreground">浏览所有公开的流程文档</p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索流程..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">暂无公开的流程文档</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkflows.map((workflow) => (
              <Card
                key={workflow.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openViewDialog(workflow)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2">{workflow.title}</CardTitle>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {workflow.description || '暂无描述'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {workflow.video_path && (
                      <Badge variant="secondary" className="gap-1">
                        <Video className="h-3 w-3" />
                        视频
                      </Badge>
                    )}
                    {workflow.markdown_content && (
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="h-3 w-3" />
                        文档
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(workflow.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 预览流程对话框 */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedWorkflow?.title}</DialogTitle>
              <DialogDescription>{selectedWorkflow?.description}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="video" className="w-full">
              <TabsList>
                <TabsTrigger value="video">视频</TabsTrigger>
                <TabsTrigger value="markdown">文档</TabsTrigger>
              </TabsList>
              <TabsContent value="video" className="mt-4">
                {videoUrl ? (
                  <video controls className="w-full rounded-lg" src={videoUrl}>
                    您的浏览器不支持视频播放
                  </video>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                    <p className="text-muted-foreground">暂无视频</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="markdown" className="mt-4">
                <div className="p-4 border rounded-lg prose prose-sm max-w-none dark:prose-invert">
                  {selectedWorkflow?.markdown_content ? (
                    <ReactMarkdown>{selectedWorkflow.markdown_content}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground">暂无文档内容</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
