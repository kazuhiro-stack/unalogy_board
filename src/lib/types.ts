// DB テーブルの型定義

export interface Profile {
  id: string;
  auth_user_id: string;
  name: string;
  title: string;
  tagline: string;
  bio: string;
  looking_for: string;
  photo_url: string | null;
  achievements: string[];
  sns_links: Record<string, string>;
  is_available: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  profile_id: string;
  skill_name: string;
  category_id: string | null;
  display_order: number;
  created_at: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  color_code: string;
  display_order: number;
  created_at: string;
}

export interface Interest {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
}

// プロフィール一覧用（スキル込み）
export interface ProfileWithSkills extends Profile {
  skills: Skill[];
  interest_count?: number;
}

// プロフィール詳細用（スキル＋受けた興味ありの数）
export interface ProfileDetail extends ProfileWithSkills {
  interest_count: number;
}
