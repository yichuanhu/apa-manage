-- 更新版本验证触发器函数（移除按名称过滤）
CREATE OR REPLACE FUNCTION public.validate_package_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  max_version text;
BEGIN
  -- 验证版本号格式（数字和点分隔）
  IF NEW.version !~ '^\d+(\.\d+)*$' THEN
    RAISE EXCEPTION '版本号格式无效，请使用数字和点分隔（如 1.0.0）';
  END IF;

  -- 获取当前最高版本（不再按名称过滤）
  SELECT version INTO max_version
  FROM public.packages
  WHERE (TG_OP = 'INSERT' OR id != NEW.id)
  ORDER BY compare_versions(version, '0') DESC
  LIMIT 1;

  -- 验证新版本必须更高
  IF max_version IS NOT NULL AND compare_versions(NEW.version, max_version) <= 0 THEN
    RAISE EXCEPTION '版本号必须大于当前最高版本 %', max_version;
  END IF;

  RETURN NEW;
END;
$$;

-- 创建公开获取最新版本的数据库函数
CREATE OR REPLACE FUNCTION public.get_latest_package()
RETURNS TABLE (
  id uuid,
  name text,
  version text,
  description text,
  file_name text,
  file_path text,
  file_size bigint,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, name, version, description, 
    file_name, file_path, file_size, 
    created_at, updated_at
  FROM public.packages
  ORDER BY compare_versions(version, '0') DESC
  LIMIT 1;
$$;

-- 授予执行权限给所有人（包括匿名用户）
GRANT EXECUTE ON FUNCTION public.get_latest_package() TO anon, authenticated;