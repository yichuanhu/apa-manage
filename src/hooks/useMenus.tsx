import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface MenuItem {
  id: string;
  name: string;
  path: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  is_visible: boolean;
  children?: MenuItem[];
}

export function useMenus() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();

  const fetchMenus = async () => {
    try {
      // 获取当前用户角色可访问的菜单
      const { data: roleMenus } = await supabase
        .from('role_menus')
        .select('menu_id')
        .eq('role', userRole || 'user');

      const menuIds = roleMenus?.map(rm => rm.menu_id) || [];

      // 获取所有菜单
      const { data: allMenus } = await supabase
        .from('menus')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

      if (allMenus) {
        // 过滤出用户有权限的菜单
        const accessibleMenus = allMenus.filter(menu => menuIds.includes(menu.id));
        
        // 构建菜单树
        const menuTree = buildMenuTree(accessibleMenus);
        setMenus(menuTree);
      }
    } catch (error) {
      console.error('Error fetching menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildMenuTree = (menus: MenuItem[]): MenuItem[] => {
    const menuMap = new Map<string, MenuItem>();
    const roots: MenuItem[] = [];

    // 首先创建所有菜单项的映射
    menus.forEach(menu => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    // 构建树结构
    menus.forEach(menu => {
      const menuItem = menuMap.get(menu.id)!;
      if (menu.parent_id && menuMap.has(menu.parent_id)) {
        const parent = menuMap.get(menu.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(menuItem);
      } else if (!menu.parent_id) {
        roots.push(menuItem);
      }
    });

    // 如果子菜单的父菜单不在权限列表中，将子菜单提升为根菜单
    menus.forEach(menu => {
      if (menu.parent_id && !menuMap.has(menu.parent_id)) {
        const menuItem = menuMap.get(menu.id)!;
        if (!roots.includes(menuItem)) {
          roots.push(menuItem);
        }
      }
    });

    return roots;
  };

  useEffect(() => {
    if (userRole) {
      fetchMenus();
    }
  }, [userRole]);

  return { menus, loading, refetch: fetchMenus };
}
