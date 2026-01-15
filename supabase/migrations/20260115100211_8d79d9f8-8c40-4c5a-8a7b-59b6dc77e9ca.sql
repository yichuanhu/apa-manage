-- 创建版本比较函数
CREATE OR REPLACE FUNCTION public.compare_versions(v1 text, v2 text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts1 text[];
  parts2 text[];
  max_len integer;
  p1 integer;
  p2 integer;
BEGIN
  parts1 := string_to_array(v1, '.');
  parts2 := string_to_array(v2, '.');
  max_len := GREATEST(array_length(parts1, 1), array_length(parts2, 1));
  
  FOR i IN 1..max_len LOOP
    p1 := COALESCE(parts1[i]::integer, 0);
    p2 := COALESCE(parts2[i]::integer, 0);
    IF p1 > p2 THEN RETURN 1; END IF;
    IF p1 < p2 THEN RETURN -1; END IF;
  END LOOP;
  
  RETURN 0;
END;
$$;

-- 创建版本号验证触发器函数
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

  -- 获取同名安装包的最高版本
  SELECT version INTO max_version
  FROM public.packages
  WHERE name = NEW.name
    AND (TG_OP = 'INSERT' OR id != NEW.id)
  ORDER BY compare_versions(version, '0') DESC
  LIMIT 1;

  -- 如果存在同名包，验证新版本必须更高
  IF max_version IS NOT NULL AND compare_versions(NEW.version, max_version) <= 0 THEN
    RAISE EXCEPTION '版本号必须大于当前最高版本 %', max_version;
  END IF;

  RETURN NEW;
END;
$$;

-- 创建触发器
CREATE TRIGGER validate_package_version_trigger
BEFORE INSERT OR UPDATE ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.validate_package_version();