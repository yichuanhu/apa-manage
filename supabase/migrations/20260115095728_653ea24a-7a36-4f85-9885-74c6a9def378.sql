-- 1. 允许任何人读取 packages 表（公开查询最新版本）
CREATE POLICY "Anyone can view packages"
ON public.packages
FOR SELECT
USING (true);

-- 2. 允许任何人下载 packages 存储桶中的文件
CREATE POLICY "Anyone can download packages"
ON storage.objects
FOR SELECT
USING (bucket_id = 'packages');