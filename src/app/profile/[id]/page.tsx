import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProfilePageClient } from "./client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, title, tagline, photo_url")
    .eq("id", id)
    .eq("is_approved", true)
    .single();

  if (!profile) {
    return { title: "プロフィールが見つかりません | TalentBoard" };
  }

  return {
    title: `${profile.name} - ${profile.title} | TalentBoard`,
    description: profile.tagline || `${profile.name}のプロフィール`,
    openGraph: {
      title: `${profile.name} - ${profile.title}`,
      description: profile.tagline || `${profile.name}のプロフィール`,
      ...(profile.photo_url ? { images: [profile.photo_url] } : {}),
    },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, skills(*)")
    .eq("id", id)
    .eq("is_approved", true)
    .single();

  if (!profile) {
    notFound();
  }

  // 興味あり件数
  const { count } = await supabase
    .from("interests")
    .select("id", { count: "exact", head: true })
    .eq("to_profile_id", id);

  // ログインユーザー
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ProfilePageClient
      profile={{ ...profile, interest_count: count || 0 }}
      currentUserId={user?.id || null}
    />
  );
}
