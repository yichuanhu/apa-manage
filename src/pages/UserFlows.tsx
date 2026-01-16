import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Search, Download, RefreshCw } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface UserFlow {
  id: string;
  flow_id: string;
  user_id: string;
  flow_name: string;
  flow_description: string | null;
  client_version: string | null;
  platform: 'windows' | 'mac' | 'linux';
  package_hash: string | null;
  package_size: number | null;
  package_url: string | null;
  status: 'INIT' | 'ANALYZED' | 'SUPERSEDED';
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 10;

const UserFlows = () => {
  const [flows, setFlows] = useState<UserFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFlowId, setSearchFlowId] = useState('');
  const [searchFlowName, setSearchFlowName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_flows')
        .select('*', { count: 'exact' });

      // flowId 完全匹配
      if (searchFlowId.trim()) {
        query = query.eq('flow_id', searchFlowId.trim());
      }

      // flowName 模糊查询
      if (searchFlowName.trim()) {
        query = query.ilike('flow_name', `%${searchFlowName.trim()}%`);
      }

      // 分页
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setFlows(data as UserFlow[] || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast.error('获取用户流程失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, [currentPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchFlows();
  };

  const handleReset = () => {
    setSearchFlowId('');
    setSearchFlowName('');
    setCurrentPage(1);
    fetchFlows();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusBadge = (status: UserFlow['status']) => {
    switch (status) {
      case 'INIT':
        return <Badge variant="secondary">待分析</Badge>;
      case 'ANALYZED':
        return <Badge variant="default">已分析</Badge>;
      case 'SUPERSEDED':
        return <Badge variant="outline">已替代</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlatformBadge = (platform: UserFlow['platform']) => {
    const colors: Record<string, string> = {
      windows: 'bg-blue-100 text-blue-800',
      mac: 'bg-gray-100 text-gray-800',
      linux: 'bg-orange-100 text-orange-800',
    };
    return (
      <Badge className={colors[platform] || ''} variant="outline">
        {platform}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">用户流程查询</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">查询条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flowId">流程 ID（精确匹配）</Label>
              <Input
                id="flowId"
                placeholder="输入流程 ID"
                value={searchFlowId}
                onChange={(e) => setSearchFlowId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flowName">流程名称（模糊匹配）</Label>
              <Input
                id="flowName"
                placeholder="输入流程名称"
                value={searchFlowName}
                onChange={(e) => setSearchFlowName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} className="flex-1">
                <Search className="mr-2 h-4 w-4" />
                查询
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : flows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>流程 ID</TableHead>
                      <TableHead>流程名称</TableHead>
                      <TableHead>平台</TableHead>
                      <TableHead>客户端版本</TableHead>
                      <TableHead>流程包大小</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>上传时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flows.map((flow) => (
                      <TableRow key={flow.id}>
                        <TableCell className="font-mono text-sm">
                          {flow.flow_id}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{flow.flow_name}</div>
                            {flow.flow_description && (
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {flow.flow_description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getPlatformBadge(flow.platform)}</TableCell>
                        <TableCell>{flow.client_version || '-'}</TableCell>
                        <TableCell>{formatFileSize(flow.package_size)}</TableCell>
                        <TableCell>{getStatusBadge(flow.status)}</TableCell>
                        <TableCell>{formatDate(flow.created_at)}</TableCell>
                        <TableCell>
                          {flow.package_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                window.open(flow.package_url!, '_blank');
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    共 {totalCount} 条记录，第 {currentPage} / {totalPages} 页
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserFlows;
