-- 创建一个临时函数来创建管理员用户
CREATE OR REPLACE FUNCTION create_admin_user_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    new_user_id uuid;
    existing_profile_count int;
BEGIN
    -- 检查用户是否已存在
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'admin@apa.com';
    
    IF new_user_id IS NULL THEN
        -- 插入新用户到 auth.users
        -- 密码是 admin123 的 SHA256 哈希值
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@apa.com',
            extensions.crypt('240be518fabd2724ddb6f04eeb9d884d18d1db51ce0f9b4db13f0f1d215e7c52', extensions.gen_salt('bf')),
            now(),
            now(),
            now(),
            '',
            '{"provider": "email", "providers": ["email"]}',
            '{"username": "admin"}',
            false
        ) RETURNING id INTO new_user_id;
    END IF;
    
    -- 检查并插入profile
    SELECT COUNT(*) INTO existing_profile_count FROM public.profiles WHERE user_id = new_user_id;
    IF existing_profile_count = 0 THEN
        INSERT INTO public.profiles (user_id, username, email)
        VALUES (new_user_id, 'admin', 'admin@apa.com');
    END IF;
    
    -- 设置为管理员角色
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin')
    ON CONFLICT DO NOTHING;
END;
$$;

-- 执行函数创建管理员
SELECT create_admin_user_v2();

-- 删除临时函数
DROP FUNCTION create_admin_user_v2();