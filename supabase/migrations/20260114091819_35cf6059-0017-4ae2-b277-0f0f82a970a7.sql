-- 创建角色枚举类型
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 创建用户角色表
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 创建用户档案表
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建菜单表
CREATE TABLE public.menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    path TEXT,
    icon TEXT,
    parent_id UUID REFERENCES public.menus(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建角色菜单关联表
CREATE TABLE public.role_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    menu_id UUID REFERENCES public.menus(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (role, menu_id)
);

-- 创建安装包表
CREATE TABLE public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size <= 1073741824), -- 1GB限制
    file_name TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建流程表
CREATE TABLE public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    video_path TEXT,
    video_size BIGINT CHECK (video_size <= 209715200), -- 200MB限制
    markdown_content TEXT,
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- 创建检查用户角色的安全函数
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 创建获取用户角色的函数
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- user_roles RLS策略
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles RLS策略
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- menus RLS策略
CREATE POLICY "Authenticated users can view menus" ON public.menus
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage menus" ON public.menus
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- role_menus RLS策略
CREATE POLICY "Authenticated users can view role_menus" ON public.role_menus
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage role_menus" ON public.role_menus
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- packages RLS策略
CREATE POLICY "Authenticated users can view packages" ON public.packages
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage packages" ON public.packages
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- workflows RLS策略 (公开流程可匿名访问)
CREATE POLICY "Anyone can view public workflows" ON public.workflows
    FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated users can view all workflows" ON public.workflows
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage workflows" ON public.workflows
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 为表添加更新时间戳触发器
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menus_updated_at
    BEFORE UPDATE ON public.menus
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_packages_updated_at
    BEFORE UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 创建自动创建用户档案的触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, username, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), NEW.email);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 创建新用户触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
    ('packages', 'packages', false, 1073741824),
    ('workflows', 'workflows', true, 209715200);

-- 存储桶RLS策略
CREATE POLICY "Authenticated users can view package files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'packages');

CREATE POLICY "Admins can upload package files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'packages' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete package files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'packages' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view workflow files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'workflows');

CREATE POLICY "Admins can upload workflow files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'workflows' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete workflow files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'workflows' AND public.has_role(auth.uid(), 'admin'));

-- 插入默认菜单
INSERT INTO public.menus (id, name, path, icon, parent_id, sort_order) VALUES
    ('11111111-1111-1111-1111-111111111111', '仪表板', '/dashboard', 'LayoutDashboard', NULL, 1),
    ('22222222-2222-2222-2222-222222222222', '系统管理', NULL, 'Settings', NULL, 2),
    ('33333333-3333-3333-3333-333333333333', '用户管理', '/users', 'Users', '22222222-2222-2222-2222-222222222222', 1),
    ('44444444-4444-4444-4444-444444444444', '角色管理', '/roles', 'Shield', '22222222-2222-2222-2222-222222222222', 2),
    ('55555555-5555-5555-5555-555555555555', '菜单管理', '/menus', 'Menu', '22222222-2222-2222-2222-222222222222', 3),
    ('66666666-6666-6666-6666-666666666666', '资源管理', NULL, 'FolderOpen', NULL, 3),
    ('77777777-7777-7777-7777-777777777777', '安装包管理', '/packages', 'Package', '66666666-6666-6666-6666-666666666666', 1),
    ('88888888-8888-8888-8888-888888888888', '流程管理', '/workflows', 'Workflow', '66666666-6666-6666-6666-666666666666', 2);

-- 为管理员角色分配所有菜单权限
INSERT INTO public.role_menus (role, menu_id)
SELECT 'admin', id FROM public.menus;

-- 为普通用户角色分配基本菜单权限
INSERT INTO public.role_menus (role, menu_id) VALUES
    ('user', '11111111-1111-1111-1111-111111111111'),
    ('user', '66666666-6666-6666-6666-666666666666'),
    ('user', '77777777-7777-7777-7777-777777777777'),
    ('user', '88888888-8888-8888-8888-888888888888');