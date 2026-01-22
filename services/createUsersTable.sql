-- 在 Supabase 的 SQL Editor 中执行此脚本，创建 users 表
-- 用于存储登录用户信息（管理员和会员）

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now()
);

-- 为 username 创建索引，加快登录查询
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 为 member_id 创建索引（如果会员登录需要关联）
CREATE INDEX IF NOT EXISTS idx_users_member_id ON public.users(member_id);

-- 示例：创建一个管理员账号（密码是 "admin123"，实际使用时请修改）
-- 注意：这里的密码哈希是 "admin123" 的 SHA-256 哈希值
-- 你可以用在线工具生成，或者运行前端代码时会自动哈希
-- INSERT INTO public.users (username, password_hash, role) 
-- VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin');

-- 示例：创建一个会员账号（关联到 members 表的某个会员）
-- INSERT INTO public.users (username, password_hash, role, member_id) 
-- VALUES ('alice', '会员密码的SHA-256哈希', 'member', 'members表中alice的id');
