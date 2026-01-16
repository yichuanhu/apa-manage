import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Search, Eye, Upload, Video, Image } from 'lucide-react';

interface Workflow {
  id: string;
  title: string;
  description: string | null;
  video_path: string | null;
  video_size: number | null;
  media_type: string | null;
  markdown_content: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  title: string;
  description: string;
  markdown_content: string;
  is_public: boolean;
}

type MediaType = 'video' | 'image';

const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '-';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface WorkflowFormProps {
  isEdit?: boolean;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  selectedMedia: File | null;
  selectedWorkflow: Workflow | null;
  mediaInputRef: React.RefObject<HTMLInputElement>;
  handleMediaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadProgress: number;
  mediaType: MediaType;
  setMediaType: React.Dispatch<React.SetStateAction<MediaType>>;
}

const WorkflowForm = ({
  isEdit = false,
  formData,
  setFormData,
  selectedMedia,
  selectedWorkflow,
  mediaInputRef,
  handleMediaChange,
  uploadProgress,
  mediaType,
  setMediaType,
}: WorkflowFormProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="title">标题</Label>
      <Input
        id="title"
        value={formData.title}
        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="description">描述</Label>
      <Input
        id="description"
        value={formData.description}
        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
      />
    </div>
    <div className="space-y-2">
      <Label>媒体类型</Label>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="mediaType"
            value="video"
            checked={mediaType === 'video'}
            onChange={() => setMediaType('video')}
            className="w-4 h-4"
          />
          <Video className="h-4 w-4" />
          <span>视频 (MP4, 最大 200MB)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="mediaType"
            value="image"
            checked={mediaType === 'image'}
            onChange={() => setMediaType('image')}
            className="w-4 h-4"
          />
          <Image className="h-4 w-4" />
          <span>图片 (JPG/PNG/GIF/WebP, 最大 10MB)</span>
        </label>
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="media">
        {mediaType === 'video' ? '视频文件' : '图片文件'}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="media"
          type="file"
          accept={mediaType === 'video' ? 'video/mp4,.mp4' : ALLOWED_IMAGE_EXTENSIONS.join(',')}
          ref={mediaInputRef}
          onChange={handleMediaChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => mediaInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {mediaType === 'video' ? '选择视频' : '选择图片'}
        </Button>
        {selectedMedia && (
          <span className="text-sm text-muted-foreground">
            {selectedMedia.name} ({formatFileSize(selectedMedia.size)})
          </span>
        )}
        {isEdit && !selectedMedia && selectedWorkflow?.video_path && (
          <span className="text-sm text-muted-foreground flex items-center">
            {selectedWorkflow.media_type === 'image' ? (
              <Image className="mr-1 h-4 w-4" />
            ) : (
              <Video className="mr-1 h-4 w-4" />
            )}
            已有{selectedWorkflow.media_type === 'image' ? '图片' : '视频'} ({formatFileSize(selectedWorkflow.video_size)})
          </span>
        )}
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="markdown">Markdown 内容</Label>
      <Tabs defaultValue="edit">
        <TabsList className="mb-2">
          <TabsTrigger value="edit">编辑</TabsTrigger>
          <TabsTrigger value="preview">预览</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Textarea
            id="markdown"
            className="min-h-[200px] font-mono"
            placeholder="# 流程说明&#10;&#10;在这里输入 Markdown 格式的内容..."
            value={formData.markdown_content}
            onChange={(e) => setFormData((prev) => ({ ...prev, markdown_content: e.target.value }))}
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="min-h-[200px] p-4 border rounded-md prose prose-sm max-w-none dark:prose-invert">
            {formData.markdown_content ? (
              <ReactMarkdown>{formData.markdown_content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">无内容可预览</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    <div className="flex items-center space-x-2">
      <Switch
        id="is_public"
        checked={formData.is_public}
        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_public: checked }))}
      />
      <Label htmlFor="is_public">公开（无需登录即可访问）</Label>
    </div>
    {uploadProgress > 0 && (
      <div className="space-y-2">
        <Progress value={uploadProgress} />
        <p className="text-sm text-muted-foreground text-center">
          上传中... {uploadProgress}%
        </p>
      </div>
    )}
  </div>
);

export default function Workflows() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    markdown_content: '',
    is_public: false,
  });
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>('video');
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('获取流程列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const validateMedia = (file: File, type: MediaType): boolean => {
    if (type === 'video') {
      // 检查视频文件类型
      if (!file.type.includes('video/mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
        toast.error('只允许上传 .mp4 视频文件');
        return false;
      }
      // 检查视频文件大小
      if (file.size > MAX_VIDEO_SIZE) {
        toast.error('视频大小不能超过 200MB');
        return false;
      }
    } else {
      // 检查图片文件类型
      const isValidType = ALLOWED_IMAGE_TYPES.includes(file.type) || 
        ALLOWED_IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!isValidType) {
        toast.error('只允许上传 JPG、PNG、GIF、WebP、BMP 格式的图片');
        return false;
      }
      // 检查图片文件大小
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error('图片大小不能超过 10MB');
        return false;
      }
    }
    return true;
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateMedia(file, mediaType)) {
      setSelectedMedia(file);
    } else {
      e.target.value = '';
      setSelectedMedia(null);
    }
  };


  const handleAdd = async () => {
    if (!formData.title) {
      toast.error('请填写流程标题');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      let mediaPath = null;
      let mediaSize = null;
      let currentMediaType = null;

      // 上传媒体文件（如果有）
      if (selectedMedia) {
        const fileExt = selectedMedia.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const folder = mediaType === 'video' ? 'videos' : 'images';
        mediaPath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('workflows')
          .upload(mediaPath, selectedMedia, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        mediaSize = selectedMedia.size;
        currentMediaType = mediaType;
        setUploadProgress(50);
      }

      // 创建数据库记录
      const { error: dbError } = await supabase.from('workflows').insert({
        title: formData.title,
        description: formData.description || null,
        video_path: mediaPath,
        video_size: mediaSize,
        media_type: currentMediaType,
        markdown_content: formData.markdown_content || null,
        is_public: formData.is_public,
        created_by: user?.id,
      });

      if (dbError) {
        // 如果数据库插入失败，删除已上传的文件
        if (mediaPath) {
          await supabase.storage.from('workflows').remove([mediaPath]);
        }
        throw dbError;
      }

      setUploadProgress(100);
      toast.success('流程创建成功');
      setIsAddDialogOpen(false);
      resetForm();
      fetchWorkflows();
    } catch (error: any) {
      console.error('Error creating workflow:', error);
      toast.error(error.message || '创建流程失败');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = async () => {
    if (!selectedWorkflow) return;

    setSubmitting(true);
    setUploadProgress(0);

    try {
      let mediaPath = selectedWorkflow.video_path;
      let mediaSize = selectedWorkflow.video_size;
      let currentMediaType = selectedWorkflow.media_type;

      // 上传新媒体文件（如果有）
      if (selectedMedia) {
        // 删除旧文件
        if (selectedWorkflow.video_path) {
          await supabase.storage.from('workflows').remove([selectedWorkflow.video_path]);
        }

        const fileExt = selectedMedia.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const folder = mediaType === 'video' ? 'videos' : 'images';
        mediaPath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('workflows')
          .upload(mediaPath, selectedMedia, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        mediaSize = selectedMedia.size;
        currentMediaType = mediaType;
        setUploadProgress(50);
      }

      // 更新数据库记录
      const { error } = await supabase
        .from('workflows')
        .update({
          title: formData.title,
          description: formData.description || null,
          video_path: mediaPath,
          video_size: mediaSize,
          media_type: currentMediaType,
          markdown_content: formData.markdown_content || null,
          is_public: formData.is_public,
        })
        .eq('id', selectedWorkflow.id);

      if (error) throw error;

      setUploadProgress(100);
      toast.success('流程更新成功');
      setIsEditDialogOpen(false);
      setSelectedWorkflow(null);
      fetchWorkflows();
    } catch (error: any) {
      console.error('Error updating workflow:', error);
      toast.error(error.message || '更新流程失败');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkflow) return;

    setSubmitting(true);
    try {
      // 删除存储中的媒体文件
      if (selectedWorkflow.video_path) {
        await supabase.storage.from('workflows').remove([selectedWorkflow.video_path]);
      }

      // 删除数据库记录
      const { error } = await supabase.from('workflows').delete().eq('id', selectedWorkflow.id);

      if (error) throw error;

      toast.success('流程删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedWorkflow(null);
      fetchWorkflows();
    } catch (error: any) {
      console.error('Error deleting workflow:', error);
      toast.error(error.message || '删除流程失败');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      markdown_content: '',
      is_public: false,
    });
    setSelectedMedia(null);
    setMediaType('video');
    if (mediaInputRef.current) {
      mediaInputRef.current.value = '';
    }
  };

  const openEditDialog = async (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setFormData({
      title: workflow.title,
      description: workflow.description || '',
      markdown_content: workflow.markdown_content || '',
      is_public: workflow.is_public,
    });
    setSelectedMedia(null);
    setMediaType((workflow.media_type as MediaType) || 'video');
    setIsEditDialogOpen(true);
  };

  const openViewDialog = async (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setFormData({
      title: workflow.title,
      description: workflow.description || '',
      markdown_content: workflow.markdown_content || '',
      is_public: workflow.is_public,
    });

    // 获取媒体URL
    if (workflow.video_path) {
      const { data } = supabase.storage.from('workflows').getPublicUrl(workflow.video_path);
      setMediaUrl(data.publicUrl);
    } else {
      setMediaUrl(null);
    }

    setIsViewDialogOpen(true);
  };

  const openDeleteDialog = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setIsDeleteDialogOpen(true);
  };

  const filteredWorkflows = workflows.filter(
    (workflow) =>
      workflow.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workflow.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">流程管理</h1>
          <p className="text-muted-foreground">管理系统流程文档</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          创建流程
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索流程..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>媒体</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    暂无流程数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">{workflow.title}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {workflow.description || '-'}
                    </TableCell>
                    <TableCell>
                      {workflow.video_path ? (
                        <Badge variant="default">
                          {workflow.media_type === 'image' ? (
                            <Image className="mr-1 h-3 w-3" />
                          ) : (
                            <Video className="mr-1 h-3 w-3" />
                          )}
                          {formatFileSize(workflow.video_size)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">无媒体</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={workflow.is_public ? 'default' : 'secondary'}>
                        {workflow.is_public ? '公开' : '隐藏'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(workflow.created_at).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewDialog(workflow)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(workflow)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(workflow)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 添加流程对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建流程</DialogTitle>
            <DialogDescription>创建新的流程文档</DialogDescription>
          </DialogHeader>
          <WorkflowForm
            formData={formData}
            setFormData={setFormData}
            selectedMedia={selectedMedia}
            selectedWorkflow={selectedWorkflow}
            mediaInputRef={mediaInputRef}
            handleMediaChange={handleMediaChange}
            uploadProgress={uploadProgress}
            mediaType={mediaType}
            setMediaType={setMediaType}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑流程对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑流程</DialogTitle>
            <DialogDescription>修改流程信息</DialogDescription>
          </DialogHeader>
          <WorkflowForm
            isEdit
            formData={formData}
            setFormData={setFormData}
            selectedMedia={selectedMedia}
            selectedWorkflow={selectedWorkflow}
            mediaInputRef={mediaInputRef}
            handleMediaChange={handleMediaChange}
            uploadProgress={uploadProgress}
            mediaType={mediaType}
            setMediaType={setMediaType}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览流程对话框 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedWorkflow?.title}</DialogTitle>
            <DialogDescription>{selectedWorkflow?.description}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="media" className="w-full">
            <TabsList>
              <TabsTrigger value="media">
                {selectedWorkflow?.media_type === 'image' ? '图片' : '视频'}
              </TabsTrigger>
              <TabsTrigger value="markdown">文档</TabsTrigger>
            </TabsList>
            <TabsContent value="media" className="mt-4">
              {mediaUrl ? (
                selectedWorkflow?.media_type === 'image' ? (
                  <img 
                    src={mediaUrl} 
                    alt={selectedWorkflow?.title} 
                    className="w-full rounded-lg max-h-[500px] object-contain"
                  />
                ) : (
                  <video controls className="w-full rounded-lg" src={mediaUrl}>
                    您的浏览器不支持视频播放
                  </video>
                )
              ) : (
                <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                  <p className="text-muted-foreground">暂无媒体文件</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="markdown" className="mt-4">
              <div className="p-4 border rounded-lg prose prose-sm max-w-none dark:prose-invert">
                {formData.markdown_content ? (
                  <ReactMarkdown>{formData.markdown_content}</ReactMarkdown>
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

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除流程 "{selectedWorkflow?.title}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
