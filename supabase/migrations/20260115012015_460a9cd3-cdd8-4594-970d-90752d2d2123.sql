-- 修复默认管理员密码：将 encrypted_password 设置为 bcrypt( sha256('admin123') )
-- 客户端发送的口令为 SHA256('admin123') = 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
UPDATE auth.users
SET encrypted_password = extensions.crypt(
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  extensions.gen_salt('bf')
),
updated_at = now()
WHERE email = 'admin@apa.com';