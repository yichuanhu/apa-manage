-- 添加媒体类型字段来区分视频和图片
ALTER TABLE public.workflows 
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'video';

-- 为已有数据设置媒体类型
UPDATE public.workflows 
SET media_type = 'video' 
WHERE video_path IS NOT NULL AND media_type IS NULL;