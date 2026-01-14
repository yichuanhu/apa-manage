import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

interface Menu {
  id: string;
  name: string;
  path: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

const iconOptions = [
  'LayoutDashboard',
  'Settings',
  'Users',
  'Shield',
  'Menu',
  'Package',
  'Workflow',
  'FolderOpen',
];

export default function Menus() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    icon: '',
    parent_id: '',
    sort_order: 0,
    is_visible: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchMenus = async () => {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setMenus(data || []);
    } catch (error) {
      console.error('Error fetching menus:', error);
      toast.error('获取菜单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      path: '',
      icon: '',
      parent_id: '',
      sort_order: 0,
      is_visible: true,
    });
  };

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('请填写菜单名称');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('menus').insert({
        name: formData.name,
        path: formData.path || null,
        icon: formData.icon || null,
        parent_id: formData.parent_id || null,
        sort_order: formData.sort_order,
        is_visible: formData.is_visible,
      });

      if (error) throw error;

      toast.success('菜单创建成功');
      setIsAddDialogOpen(false);
      resetForm();
      fetchMenus();
    } catch (error: any) {
      console.error('Error creating menu:', error);
      toast.error(error.message || '创建菜单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedMenu) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('menus')
        .update({
          name: formData.name,
          path: formData.path || null,
          icon: formData.icon || null,
          parent_id: formData.parent_id || null,
          sort_order: formData.sort_order,
          is_visible: formData.is_visible,
        })
        .eq('id', selectedMenu.id);

      if (error) throw error;

      toast.success('菜单更新成功');
      setIsEditDialogOpen(false);
      setSelectedMenu(null);
      fetchMenus();
    } catch (error: any) {
      console.error('Error updating menu:', error);
      toast.error(error.message || '更新菜单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMenu) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('menus').delete().eq('id', selectedMenu.id);

      if (error) throw error;

      toast.success('菜单删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedMenu(null);
      fetchMenus();
    } catch (error: any) {
      console.error('Error deleting menu:', error);
      toast.error(error.message || '删除菜单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (menu: Menu) => {
    setSelectedMenu(menu);
    setFormData({
      name: menu.name,
      path: menu.path || '',
      icon: menu.icon || '',
      parent_id: menu.parent_id || '',
      sort_order: menu.sort_order,
      is_visible: menu.is_visible,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (menu: Menu) => {
    setSelectedMenu(menu);
    setIsDeleteDialogOpen(true);
  };

  const getParentMenuName = (parentId: string | null) => {
    if (!parentId) return '-';
    const parent = menus.find((m) => m.id === parentId);
    return parent?.name || '-';
  };

  // 获取可选的父级菜单（排除自己和自己的子菜单）
  const getAvailableParentMenus = () => {
    return menus.filter((m) => {
      if (!selectedMenu) return !m.parent_id; // 只显示顶级菜单
      return m.id !== selectedMenu.id && !m.parent_id;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const MenuForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">菜单名称</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="path">路径</Label>
        <Input
          id="path"
          placeholder="/example"
          value={formData.path}
          onChange={(e) => setFormData({ ...formData, path: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="icon">图标</Label>
        <Select
          value={formData.icon}
          onValueChange={(value) => setFormData({ ...formData, icon: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择图标" />
          </SelectTrigger>
          <SelectContent>
            {iconOptions.map((icon) => (
              <SelectItem key={icon} value={icon}>
                {icon}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="parent">父级菜单</Label>
        <Select
          value={formData.parent_id}
          onValueChange={(value) =>
            setFormData({ ...formData, parent_id: value === 'none' ? '' : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="选择父级菜单" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">无（顶级菜单）</SelectItem>
            {getAvailableParentMenus().map((menu) => (
              <SelectItem key={menu.id} value={menu.id}>
                {menu.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sort_order">排序</Label>
        <Input
          id="sort_order"
          type="number"
          value={formData.sort_order}
          onChange={(e) =>
            setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
          }
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="is_visible"
          checked={formData.is_visible}
          onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
        />
        <Label htmlFor="is_visible">可见</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">菜单管理</h1>
          <p className="text-muted-foreground">管理系统导航菜单</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          添加菜单
        </Button>
      </div>

      <Card>
        <CardHeader />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>菜单名称</TableHead>
                <TableHead>路径</TableHead>
                <TableHead>图标</TableHead>
                <TableHead>父级菜单</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    暂无菜单数据
                  </TableCell>
                </TableRow>
              ) : (
                menus.map((menu) => (
                  <TableRow key={menu.id}>
                    <TableCell className={menu.parent_id ? 'pl-8' : 'font-medium'}>
                      {menu.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {menu.path || '-'}
                    </TableCell>
                    <TableCell>{menu.icon || '-'}</TableCell>
                    <TableCell>{getParentMenuName(menu.parent_id)}</TableCell>
                    <TableCell>{menu.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={menu.is_visible ? 'default' : 'secondary'}>
                        {menu.is_visible ? '显示' : '隐藏'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(menu)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(menu)}
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

      {/* 添加菜单对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加菜单</DialogTitle>
            <DialogDescription>创建一个新的导航菜单</DialogDescription>
          </DialogHeader>
          <MenuForm />
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

      {/* 编辑菜单对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑菜单</DialogTitle>
            <DialogDescription>修改菜单信息</DialogDescription>
          </DialogHeader>
          <MenuForm />
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
              确定要删除菜单 "{selectedMenu?.name}" 吗？此操作无法撤销。
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
