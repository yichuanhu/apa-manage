-- 更新现有管理员用户的空字符串字段
UPDATE auth.users 
SET 
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    recovery_token = '',
    phone_change = '',
    phone_change_token = '',
    reauthentication_token = '',
    email_change_confirm_status = 0
WHERE email = 'admin@apa.com';