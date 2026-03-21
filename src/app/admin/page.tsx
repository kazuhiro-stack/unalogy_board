"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 管理者のメールアドレスをここに設定
const ADMIN_EMAILS = [
  // 自分のGoogleアカウントのメールアドレスを追加してください
  // 例: "kazu@example.com"
];

interface MemberProfile {
  id: string;
  auth_user_id: string;
  name: string;
  title: string;
  tagline: string;
  bio: string;
  photo_url: string | null;
  is_available: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  skills: { id: string; skill_name: string }[];
  interest_received: number;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // 管理者チェック（ADMIN_EMAILSが空の場合は全員管理者扱い＝開発中）
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email || "")) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);
    await loadMembers();
  }

  async function loadMembers() {
    // 全プロフィールを取得（承認・未承認問わず）
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*, skills(id, skill_name)")
      .order("created_at", { ascending: false });

    if (profiles) {
      // 興味あり件数を取得
      const { data: interests } = await supabase
        .from("interests")
        .select("to_profile_id");

      const countMap: Record<string, number> = {};
      if (interests) {
        for (const i of interests) {
          countMap[i.to_profile_id] = (countMap[i.to_profile_id] || 0) + 1;
        }
      }

      const enriched: MemberProfile[] = profiles.map((p) => ({
        ...p,
        interest_received: countMap[p.id] || 0,
      }));

      setMembers(enriched);
    }

    setLoading(false);
  }

  async function toggleApproval(profileId: string, currentlyApproved: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: !currentlyApproved })
      .eq("id", profileId);

    if (!error) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === profileId ? { ...m, is_approved: !currentlyApproved } : m
        )
      );
    }
  }

  async function deleteProfile(profileId: string, name: string) {
    if (!confirm(`「${name}」のプロフィールを完全に削除しますか？この操作は取り消せません。`)) {
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (!error) {
      setMembers((prev) => prev.filter((m) => m.id !== profileId));
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const filteredMembers = members.filter((m) => {
    if (filter === "pending") return !m.is_approved;
    if (filter === "approved") return m.is_approved;
    return true;
  });

  const pendingCount = members.filter((m) => !m.is_approved).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <p className="font-semibold text-gray-600">アクセス権限がありません</p>
          <p className="text-sm text-gray-400 mt-1">管理者のみアクセスできます</p>
          <a
            href="/"
            className="inline-block mt-4 px-5 py-2 text-sm font-semibold text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
          >
            トップに戻る
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">TalentBoard</span>
            <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
              ADMIN
            </span>
          </a>
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← メンバー一覧に戻る
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
            <p className="text-sm text-gray-400 mt-1">
              {members.length}人のメンバー
              {pendingCount > 0 && (
                <span className="ml-2 text-orange-500 font-semibold">
                  （{pendingCount}人が承認待ち）
                </span>
              )}
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { key: "all", label: `全て (${members.length})` },
              { key: "pending", label: `承認待ち (${pendingCount})` },
              { key: "approved", label: `承認済み (${members.length - pendingCount})` },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  filter === tab.key
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pending alert */}
        {pendingCount > 0 && filter !== "approved" && (
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100 mb-6">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-orange-700">{pendingCount}人のメンバーが承認待ちです</p>
              <p className="text-[11px] text-orange-400">承認するとメンバー一覧に表示されます</p>
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border rounded-xl transition-all ${
                member.is_approved
                  ? "border-gray-100"
                  : "border-orange-200 bg-orange-50/30"
              }`}
            >
              {/* Avatar + Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-500 font-bold text-sm">
                      {member.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{member.name}</p>
                    {!member.is_approved && (
                      <span className="text-[10px] font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        承認待ち
                      </span>
                    )}
                    {member.is_available && member.is_approved && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        受付中
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">{member.title}</p>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1 sm:max-w-[200px]">
                {member.skills.slice(0, 3).map((s) => (
                  <span key={s.id} className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-semibold rounded">
                    {s.skill_name}
                  </span>
                ))}
                {member.skills.length > 3 && (
                  <span className="px-2 py-0.5 text-gray-300 text-[10px] font-semibold">
                    +{member.skills.length - 3}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-[11px] text-gray-400 flex-shrink-0">
                {member.interest_received > 0 && (
                  <span className="flex items-center gap-1 text-pink-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {member.interest_received}
                  </span>
                )}
                <span>{formatDate(member.created_at)}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleApproval(member.id, member.is_approved)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    member.is_approved
                      ? "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500"
                      : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                  }`}
                >
                  {member.is_approved ? "非公開にする" : "承認する"}
                </button>
                <button
                  onClick={() => deleteProfile(member.id, member.name)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="削除"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <p className="font-semibold text-gray-400">該当するメンバーがいません</p>
          </div>
        )}
      </div>
    </div>
  );
}
