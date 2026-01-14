import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Settings } from 'lucide-react';

interface Menu {
  id: string;
  name: string;
  path: string | null;
  parent_id: string | null;
}

interface RoleMenu {
  role: 'admin' | 'user';
  menu_id: string;
}

export default function Roles() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [roleMenus, setRoleMenus] = useState<RoleMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const roles = [
    { id: 'admin', name: '管理员', description: '拥有所有权限' },
    { id: 'user', name: '普通用户', description: '拥有基本权限' },
  ];

  const fetchData = async () => {
    try {
      const [menusRes, roleMenusRes] = await Promise.all([
        supabase.from('menus').select('*').order('sort_order'),
        supabase.from('role_menus').select('*'),
      ]);

      if (menusRes.data) setMenus(menusRes.data);
      if (roleMenusRes.data) setRoleMenus(roleMenusRes.data as RoleMenu[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPermissionDialog = (role: 'admin' | 'user') => {
    setSelectedRole(role);
    const menuIds = roleMenus
      .filter((rm) => rm.role === role)
      .map((rm) => rm.menu_id);
    setSelectedMenuIds(menuIds);
    setIsDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setSubmitting(true);
    try {
      // 删除该角色的所有菜单权限
      await supabase.from('role_menus').delete().eq('role', selectedRole);

      // 添加新的菜单权限
      if (selectedMenuIds.length > 0) {
        const newRoleMenus = selectedMenuIds.map((menuId) => ({
          role: selectedRole,
          menu_id: menuId,
        }));
        await supabase.from('role_menus').insert(newRoleMenus);
      }

      toast.success('权限保存成功');
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('保存权限失败');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMenu = (menuId: string) => {
    setSelectedMenuIds((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const getRoleMenuCount = (role: 'admin' | 'user') => {
    return roleMenus.filter((rm) => rm.role === role).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">角色管理</h1>
        <p className="text-muted-foreground">管理系统角色和权限配置</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {role.name}
                    <Badge variant={role.id === 'admin' ? 'default' : 'secondary'}>
                      {getRoleMenuCount(role.id as 'admin' | 'user')} 个菜单权限
                    </Badge>
                  </CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPermissionDialog(role.id as 'admin' | 'user')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  配置权限
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                已分配菜单：
                {menus
                  .filter((m) =>
                    roleMenus.some(
                      (rm) => rm.role === role.id && rm.menu_id === m.id
                    )
                  )
                  .map((m) => m.name)
                  .join('、') || '无'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              配置{selectedRole === 'admin' ? '管理员' : '普通用户'}权限
            </DialogTitle>
            <DialogDescription>选择该角色可以访问的菜单</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">选择</TableHead>
                  <TableHead>菜单名称</TableHead>
                  <TableHead>路径</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menus.map((menu) => (
                  <TableRow key={menu.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedMenuIds.includes(menu.id)}
                        onCheckedChange={() => toggleMenu(menu.id)}
                      />
                    </TableCell>
                    <TableCell className={menu.parent_id ? 'pl-8' : 'font-medium'}>
                      {menu.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {menu.path || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSavePermissions} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
