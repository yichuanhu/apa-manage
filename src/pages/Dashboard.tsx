import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, Workflow, Shield } from 'lucide-react';

export default function Dashboard() {
  const { profile, userRole } = useAuth();

  const stats = [
    {
      title: '用户数量',
      value: '-',
      description: '系统用户总数',
      icon: Users,
    },
    {
      title: '安装包',
      value: '-',
      description: '已上传安装包数量',
      icon: Package,
    },
    {
      title: '流程',
      value: '-',
      description: '已创建流程数量',
      icon: Workflow,
    },
    {
      title: '角色',
      value: '2',
      description: '系统角色数量',
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">仪表板</h1>
        <p className="text-muted-foreground">
          欢迎回来，{profile?.username || '用户'}！当前角色：{userRole === 'admin' ? '管理员' : '普通用户'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
