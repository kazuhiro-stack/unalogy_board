import { createClient } from "@/lib/supabase/server";
import type { ProfileWithSkills } from "@/lib/types";
import { TalentGrid } from "@/components/TalentGrid";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  // 承認済みプロフィール＋スキルを取得
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*, skills(*)")
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  // 各プロフィールの興味あり件数を取得
  const profilesWithCounts: ProfileWithSkills[] = [];
  if (profiles) {
    const { data: interests } = await supabase
      .from("interests")
      .select("to_profile_id");

    const countMap: Record<string, number> = {};
    if (interests) {
      for (const i of interests) {
        countMap[i.to_profile_id] = (countMap[i.to_profile_id] || 0) + 1;
      }
    }

    for (const p of profiles) {
      profilesWithCounts.push({
        ...p,
        interest_count: countMap[p.id] || 0,
      });
    }
  }

  // スキルカテゴリを取得
  const { data: categories } = await supabase
    .from("skill_categories")
    .select("*")
    .order("display_order");

  // ログインユーザー情報
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <TalentGrid
      profiles={profilesWithCounts}
      categories={categories || []}
      currentUserId={user?.id || null}
    />
  );
}
