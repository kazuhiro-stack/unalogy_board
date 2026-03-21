"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface InterestWithSender {
  id: string;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
  sender: {
    id: string;
    name: string;
    title: string;
    photo_url: string | null;
    tagline: string;
  } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [interests, setInterests] = useState<InterestWithSender[]>([]);
  const [myName, setMyName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // 自分のプロフィールを取得
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("auth_user_id", user.id)
      .single();

    if (!myProfile) {
      router.push("/profile/edit");
      return;
    }

    setMyName(myProfile.name);

    // 受け取った「興味あり」を取得
    const { data: receivedInterests } = await supabase
      .from("interests")
      .select("id, message, is_anonymous, created_at, from_profile_id")
      .eq("to_profile_id", myProfile.id)
      .order("created_at", { ascending: false });

    if (receivedInterests && receivedInterests.length > 0) {
      // 送信者のプロフィールを取得
      const senderIds = receivedInterests.map((i) => i.from_profile_id);
      const { data: senders } = await supabase
        .from("profiles")
        .select("id, name, title, photo_url, tagline")
        .in("id", senderIds);

      const senderMap: Record<string, (typeof senders extends (infer T)[] | null ? T : never)> = {};
      if (senders) {
        for (const s of senders) {
          senderMap[s.id] = s;
        }
      }

      const enriched: InterestWithSender[] = receivedInterests.map((i) => ({
        id: i.id,
        message: i.message,
        is_anonymous: false,
        created_at: i.created_at,
        sender: senderMap[i.from_profile_id] || null,
      }));

      setInterests(enriched);
    }

    setLoading(false);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    if (diffHour < 24) return `${diffHour}時間前`;
    if (diffDay < 7) return `${diffDay}日前`;
    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900 hidden sm:block">TalentBoard</span>
          </a>
          <nav className="flex items-center gap-1">
            <a href="/" className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors">
              メンバー一覧
            </a>
            <a href="/profile/edit" className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors">
              プロフィール編集
            </a>
            <a href="/dashboard" className="px-3 py-2 text-sm font-medium text-pink-600 bg-pink-50 rounded-lg">
              興味あり一覧
            </a>
          </nav>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
          興味あり一覧
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          {myName}さんに「興味あり」を送ったメンバー
        </p>

        {interests.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-50 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F9A8D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <p className="font-semibold text-gray-400">まだ「興味あり」はありません</p>
            <p className="text-sm text-gray-300 mt-1">プロフィールを充実させると見つけてもらいやすくなります</p>
            <a
              href="/profile/edit"
              className="inline-block mt-4 px-5 py-2 text-sm font-semibold text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
            >
              プロフィールを編集する
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-100 mb-6">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#EC4899" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-pink-700">
                  {interests.length}件の「興味あり」
                </p>
                <p className="text-[11px] text-pink-400">
                  あなたに興味を持っているメンバーがいます
                </p>
              </div>
            </div>

            {/* List */}
            {interests.map((interest) => (
              <a
                key={interest.id}
                href="/"
                className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-pink-200 hover:shadow-sm transition-all cursor-pointer"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {interest.sender?.photo_url ? (
                    <img
                      src={interest.sender.photo_url}
                      alt={interest.sender.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-400 font-bold text-sm">
                      {interest.sender?.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700">
                    {interest.sender?.name || "メンバー"}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {interest.sender?.title || ""}
                    {interest.sender?.tagline ? ` — ${interest.sender.tagline}` : ""}
                  </p>
                </div>

                {/* Time */}
                <span className="text-[11px] text-gray-300 font-medium flex-shrink-0">
                  {formatDate(interest.created_at)}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
