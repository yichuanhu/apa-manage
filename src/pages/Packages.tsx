import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Search, Download, Upload } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  version: string;
  description: string | null;
  file_path: string;
  file_size: number;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1GB

export default function Packages() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('获取安装包列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const validateFile = (file: File): boolean => {
    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.exe')) {
      toast.error('只允许上传 .exe 文件');
      return false;
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      toast.error('文件大小不能超过 1GB');
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    } else {
      e.target.value = '';
      setSelectedFile(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.version || !selectedFile) {
      toast.error('请填写所有必填字段并选择文件');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      // 生成唯一文件名
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `packages/${fileName}`;

      // 上传文件
      const { error: uploadError } = await supabase.storage
        .from('packages')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // 创建数据库记录
      const { error: dbError } = await supabase.from('packages').insert({
        name: formData.name,
        version: formData.version,
        description: formData.description || null,
        file_path: filePath,
        file_size: selectedFile.size,
        file_name: selectedFile.name,
        uploaded_by: user?.id,
      });

      if (dbError) {
        // 如果数据库插入失败，删除已上传的文件
        await supabase.storage.from('packages').remove([filePath]);
        throw dbError;
      }

      setUploadProgress(100);
      toast.success('安装包上传成功');
      setIsAddDialogOpen(false);
      resetForm();
      fetchPackages();
    } catch (error: any) {
      console.error('Error uploading package:', error);
      toast.error(error.message || '上传安装包失败');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = async () => {
    if (!selectedPackage) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('packages')
        .update({
          name: formData.name,
          version: formData.version,
          description: formData.description || null,
        })
        .eq('id', selectedPackage.id);

      if (error) throw error;

      toast.success('安装包更新成功');
      setIsEditDialogOpen(false);
      setSelectedPackage(null);
      fetchPackages();
    } catch (error: any) {
      console.error('Error updating package:', error);
      toast.error(error.message || '更新安装包失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;

    setSubmitting(true);
    try {
      // 删除存储中的文件
      await supabase.storage.from('packages').remove([selectedPackage.file_path]);

      // 删除数据库记录
      const { error } = await supabase.from('packages').delete().eq('id', selectedPackage.id);

      if (error) throw error;

      toast.success('安装包删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedPackage(null);
      fetchPackages();
    } catch (error: any) {
      console.error('Error deleting package:', error);
      toast.error(error.message || '删除安装包失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (pkg: Package) => {
    try {
      const { data, error } = await supabase.storage
        .from('packages')
        .createSignedUrl(pkg.file_path, 60);

      if (error) throw error;

      // 创建下载链接
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = pkg.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Error downloading package:', error);
      toast.error(error.message || '下载失败');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', version: '', description: '' });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openEditDialog = (pkg: Package) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name,
      version: pkg.version,
      description: pkg.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (pkg: Package) => {
    setSelectedPackage(pkg);
    setIsDeleteDialogOpen(true);
  };

  const filteredPackages = packages.filter(
    (pkg) =>
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.version.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-foreground">安装包管理</h1>
          <p className="text-muted-foreground">管理系统安装包文件</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          上传安装包
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索安装包..."
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
                <TableHead>名称</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>文件名</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>上传时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPackages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    暂无安装包数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredPackages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>{pkg.version}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{pkg.file_name}</TableCell>
                    <TableCell>{formatFileSize(pkg.file_size)}</TableCell>
                    <TableCell>
                      {new Date(pkg.created_at).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(pkg)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(pkg)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(pkg)}
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

      {/* 添加安装包对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传安装包</DialogTitle>
            <DialogDescription>
              上传新的安装包文件（仅支持 .exe 格式，最大 1GB）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">版本</Label>
              <Input
                id="version"
                placeholder="1.0.0"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">安装包文件</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".exe"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  选择文件
                </Button>
                {selectedFile && (
                  <span className="text-sm text-muted-foreground">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </span>
                )}
              </div>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑安装包对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑安装包</DialogTitle>
            <DialogDescription>修改安装包信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-version">版本</Label>
              <Input
                id="edit-version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
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

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除安装包 "{selectedPackage?.name}" 吗？此操作无法撤销。
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
