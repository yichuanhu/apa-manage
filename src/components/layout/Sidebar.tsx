import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMenus, MenuItem } from '@/hooks/useMenus';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  Menu as MenuIcon,
  Package,
  Workflow,
  ChevronDown,
  ChevronRight,
  LogOut,
  FolderOpen,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  Menu: MenuIcon,
  Package,
  Workflow,
  FolderOpen,
};

interface SidebarProps {
  collapsed: boolean;
}

function MenuItemComponent({ item, collapsed }: { item: MenuItem; collapsed: boolean }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const Icon = item.icon ? iconMap[item.icon] || MenuIcon : MenuIcon;
  const isActive = item.path && location.pathname === item.path;
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed && 'justify-center px-2'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.name}</span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </>
            )}
          </Button>
        </CollapsibleTrigger>
        {!collapsed && (
          <CollapsibleContent className="pl-4 space-y-1">
            {item.children?.map((child) => (
              <MenuItemComponent key={child.id} item={child} collapsed={collapsed} />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  }

  return (
    <Link to={item.path || '#'}>
      <Button
        variant="ghost"
        className={cn(
          'w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </Button>
    </Link>
  );
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { menus } = useMenus();
  const { signOut, profile } = useAuth();

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <h1 className="text-xl font-bold text-sidebar-foreground">APA管理系统</h1>
        )}
        {collapsed && (
          <span className="text-xl font-bold text-sidebar-foreground mx-auto">A</span>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {menus.map((item) => (
            <MenuItemComponent key={item.id} item={item} collapsed={collapsed} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4">
        {!collapsed && profile && (
          <div className="mb-3 text-sm text-sidebar-foreground truncate">
            {profile.username}
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed && 'justify-center px-2'
          )}
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>退出登录</span>}
        </Button>
      </div>
    </div>
  );
}
