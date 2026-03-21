"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProfileWithSkills, SkillCategory } from "@/lib/types";

interface Props {
  profiles: ProfileWithSkills[];
  categories: SkillCategory[];
  currentUserId: string | null;
}

export function TalentGrid({ profiles, categories, currentUserId }: Props) {
  const router = useRouter();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<ProfileWithSkills | null>(null);
  const [sentInterests, setSentInterests] = useState<Set<string>>(new Set());

  const allSkills = [
    ...new Set(profiles.flatMap((p) => p.skills.map((s) => s.skill_name))),
  ];

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const filtered = profiles.filter((p) => {
    if (showOnlyAvailable && !p.is_available) return false;
    if (
      searchText &&
      !p.name.includes(searchText) &&
      !p.title.includes(searchText) &&
      !p.tagline.includes(searchText)
    )
      return false;
    if (
      selectedSkills.length > 0 &&
      !selectedSkills.some((s) => p.skills.some((ps) => ps.skill_name === s))
    )
      return false;
    return true;
  });

  // ページ読み込み時に既に送信済みの興味ありを取得
  useEffect(() => {
    async function loadSentInterests() {
      if (!currentUserId) return;
      const supabase = createClient();
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", currentUserId)
        .single();
      if (!myProfile) return;

      const { data: existing } = await supabase
        .from("interests")
        .select("to_profile_id")
        .eq("from_profile_id", myProfile.id);

      if (existing) {
        setSentInterests(new Set(existing.map((i) => i.to_profile_id)));
      }
    }
    loadSentInterests();
  }, [currentUserId]);

  async function sendInterest(toProfileId: string) {
    if (!currentUserId) {
      router.push("/login");
      return;
    }

    const supabase = createClient();
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", currentUserId)
      .single();

    if (!myProfile) {
      router.push("/profile/edit");
      return;
    }

    const { error } = await supabase.from("interests").insert({
      from_profile_id: myProfile.id,
      to_profile_id: toProfileId,
      is_anonymous: false,
    });

    // 成功 or 既に送信済み(409 Conflict)の場合もUIに反映
    if (!error || error.code === "23505") {
      setSentInterests((prev) => new Set(prev).add(toProfileId));
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">
              TalentBoard
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <a
              href="/"
              className="px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg"
            >
              メンバー一覧
            </a>
            {currentUserId && (
              <>
                <a
                  href="/profile/edit"
                  className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  プロフィール編集
                </a>
                <a
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  興味あり一覧
                </a>
              </>
            )}
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-1">
            {currentUserId ? (
              <>
                <a
                  href="/dashboard"
                  className="md:hidden p-2 text-gray-400 hover:text-pink-500 transition-colors"
                  title="興味あり一覧"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </a>
                <a
                  href="/profile/edit"
                  className="md:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </a>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <a
                href="/login"
                className="text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-5 py-2 rounded-full transition-all shadow-sm hover:shadow-md"
              >
                ログイン
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <div className="relative overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/40" />
        <div className="absolute top-[-120px] right-[-80px] w-[400px] h-[400px] rounded-full bg-teal-100/30 blur-3xl" />
        <div className="absolute bottom-[-80px] left-[-40px] w-[300px] h-[300px] rounded-full bg-emerald-100/20 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <p className="text-xs font-bold text-teal-500 tracking-[3px] uppercase mb-3">
            Community Talent Directory
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
            才能が出会う場所
          </h1>
          <p className="mt-3 text-gray-400 text-sm sm:text-base max-w-md leading-relaxed">
            {profiles.length}人のプロフェッショナルが集まるコミュニティ。
            <br className="hidden sm:block" />
            あなたの次のパートナーがここにいます。
          </p>

          <div className="flex gap-8 sm:gap-12 mt-8">
            {[
              { num: profiles.length, label: "メンバー" },
              {
                num: profiles.filter((p) => p.is_available).length,
                label: "受付中",
              },
              { num: allSkills.length, label: "スキル領域" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {s.num}
                </div>
                <div className="text-xs text-gray-400 font-medium mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Filter Bar ===== */}
      <div className="sticky top-16 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex gap-2 sm:gap-3 mb-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[180px]">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="名前・職種で検索..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-300 focus:bg-white focus:border-teal-300 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
              />
            </div>
            <button
              onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${
                showOnlyAvailable
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"
              }`}
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${showOnlyAvailable ? "bg-emerald-500" : "bg-gray-300"}`}
              />
              受付中のみ
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {allSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  selectedSkills.includes(skill)
                    ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-teal-300 hover:text-teal-600"
                }`}
              >
                {skill}
              </button>
            ))}
            {selectedSkills.length > 0 && (
              <button
                onClick={() => setSelectedSkills([])}
                className="px-3 py-1 text-xs text-gray-400 border border-dashed border-gray-300 rounded-full hover:text-gray-600"
              >
                クリア
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Grid ===== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <p className="text-sm text-gray-400 font-medium mb-5">
          {filtered.length}人のメンバー
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-300">
            <svg
              className="mx-auto mb-4"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="font-semibold text-gray-400">
              条件に一致するメンバーが見つかりません
            </p>
            <p className="text-sm mt-1 text-gray-300">
              フィルターを変更してみてください
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map((profile) => (
              <div
                key={profile.id}
                onClick={() => setSelectedProfile(profile)}
                className="group bg-white rounded-2xl overflow-hidden cursor-pointer 
                           border border-gray-100 hover:border-teal-200
                           shadow-sm hover:shadow-lg hover:shadow-teal-100/50
                           hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative h-48 sm:h-52 overflow-hidden bg-gray-100">
                  <img
                    src={
                      profile.photo_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=400&background=e0f2fe&color=0d9488&bold=true`
                    }
                    alt={profile.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {profile.is_available && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full shadow-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        受付中
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="text-lg font-bold text-white drop-shadow-sm">
                      {profile.name}
                    </div>
                    <div className="text-xs text-white/85 font-medium">
                      {profile.title}
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <p className="text-sm font-semibold text-gray-800 leading-relaxed line-clamp-2">
                    {profile.tagline}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {profile.skills
                      .sort((a, b) => a.display_order - b.display_order)
                      .slice(0, 4)
                      .map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[11px] font-semibold rounded-md"
                        >
                          {s.skill_name}
                        </span>
                      ))}
                    {profile.skills.length > 4 && (
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[11px] font-semibold rounded-md">
                        +{profile.skills.length - 4}
                      </span>
                    )}
                  </div>
                  {/* SNS links on card */}
                  {Object.entries(profile.sns_links || {}).filter(
                    ([, v]) => v && String(v).trim() !== "",
                  ).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {Object.entries(profile.sns_links || {})
                        .filter(([, v]) => v && String(v).trim() !== "")
                        .map(([key, value]) => {
                          const v = String(value);
                          const url = v.startsWith("http")
                            ? v
                            : key === "x"
                              ? `https://x.com/${v.replace("@", "")}`
                              : key === "github"
                                ? `https://github.com/${v}`
                                : key === "note"
                                  ? `https://note.com/${v}`
                                  : v;
                          const label =
                            key === "x"
                              ? "X"
                              : key === "note"
                                ? "note"
                                : key === "github"
                                  ? "GitHub"
                                  : "Web";
                          return (
                            <a
                              key={key}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded-md text-[11px] text-gray-400 font-medium hover:text-teal-600 hover:bg-teal-50 transition-all"
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              {label}
                            </a>
                          );
                        })}
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                    {/* Interest count */}
                    <span className="text-[11px] text-gray-300 font-medium truncate mr-2 flex items-center gap-1">
                      {(profile.interest_count || 0) +
                        (sentInterests.has(profile.id) ? 1 : 0) >
                        0 && (
                        <span className="flex items-center gap-1 text-pink-400">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            stroke="none"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          {(profile.interest_count || 0) +
                            (sentInterests.has(profile.id) ? 1 : 0)}
                          件
                        </span>
                      )}
                      {(profile.interest_count || 0) +
                        (sentInterests.has(profile.id) ? 1 : 0) ===
                        0 && (
                        <span>
                          {(profile.achievements as string[])?.[0] || ""}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!sentInterests.has(profile.id)) {
                          sendInterest(profile.id);
                        }
                      }}
                      className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                        sentInterests.has(profile.id)
                          ? "bg-pink-50 text-pink-500 border border-pink-200"
                          : "bg-gray-50 text-gray-500 hover:bg-pink-50 hover:text-pink-500"
                      }`}
                    >
                      {sentInterests.has(profile.id)
                        ? "♥ 興味あり済"
                        : "♡ 興味あり"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Footer ===== */}
      <footer className="border-t border-gray-100 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            TalentBoard
          </div>
          <p className="text-xs text-gray-300">Powered by your community</p>
        </div>
      </footer>

      {/* ===== Modal ===== */}
      {selectedProfile && (
        <div
          onClick={() => setSelectedProfile(null)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:rounded-2xl sm:max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-auto shadow-2xl rounded-t-2xl"
          >
            <div className="relative h-56 sm:h-64">
              <img
                src={
                  selectedProfile.photo_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProfile.name)}&size=600&background=e0f2fe&color=0d9488&bold=true`
                }
                alt={selectedProfile.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <button
                onClick={() => setSelectedProfile(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm text-white/90 text-lg flex items-center justify-center hover:bg-black/30 transition-colors"
              >
                ×
              </button>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/40 sm:hidden" />
              <div className="absolute bottom-5 left-5 right-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-white drop-shadow-sm">
                    {selectedProfile.name}
                  </span>
                  {selectedProfile.is_available && (
                    <span className="bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      受付中
                    </span>
                  )}
                </div>
                <div className="text-sm text-white/80 font-medium mt-1">
                  {selectedProfile.title}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border-l-[3px] border-teal-400 mb-5">
                <p className="font-bold text-gray-800 text-base leading-relaxed">
                  {selectedProfile.tagline}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {selectedProfile.skills
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((s) => (
                    <span
                      key={s.id}
                      className="px-3 py-1 bg-teal-50 text-teal-700 text-sm font-semibold rounded-lg"
                    >
                      {s.skill_name}
                    </span>
                  ))}
              </div>

              {selectedProfile.bio && (
                <div className="mb-5">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[2px] mb-2">
                    経歴・強み
                  </h3>
                  <p className="text-sm text-gray-600 leading-[1.8]">
                    {selectedProfile.bio}
                  </p>
                </div>
              )}

              {selectedProfile.looking_for && (
                <div className="mb-5">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[2px] mb-2">
                    こんな人と仕事したい
                  </h3>
                  <p className="text-sm text-gray-600 leading-[1.8]">
                    {selectedProfile.looking_for}
                  </p>
                </div>
              )}

              {(selectedProfile.achievements as string[])?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[2px] mb-2">
                    実績
                  </h3>
                  <div className="space-y-1.5">
                    {(selectedProfile.achievements as string[]).map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 font-medium"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SNS Links */}
              {Object.entries(selectedProfile.sns_links || {}).filter(
                ([, v]) => v && String(v).trim() !== "",
              ).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[2px] mb-2">
                    リンク
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedProfile.sns_links || {})
                      .filter(([, v]) => v && String(v).trim() !== "")
                      .map(([key, value]) => {
                        const v = String(value);
                        const url = v.startsWith("http")
                          ? v
                          : key === "x"
                            ? `https://x.com/${v.replace("@", "")}`
                            : key === "github"
                              ? `https://github.com/${v}`
                              : key === "note"
                                ? `https://note.com/${v}`
                                : v;
                        const label =
                          key === "x"
                            ? "X"
                            : key === "note"
                              ? "note"
                              : key === "github"
                                ? "GitHub"
                                : "Web";
                        return (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 font-medium hover:border-teal-300 hover:text-teal-600 transition-all"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            {label}
                          </a>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Profile link */}
              <a
                href={`/profile/${selectedProfile.id}`}
                className="block w-full py-2.5 text-center text-sm font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-all mb-3"
              >
                プロフィール詳細を見る →
              </a>

              <button
                onClick={() => {
                  if (!sentInterests.has(selectedProfile.id)) {
                    sendInterest(selectedProfile.id);
                  }
                }}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
                  sentInterests.has(selectedProfile.id)
                    ? "bg-pink-50 text-pink-500 border-2 border-pink-200"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-teal-200/50 hover:shadow-xl"
                }`}
              >
                {sentInterests.has(selectedProfile.id)
                  ? "♥ 興味ありを送信しました！"
                  : "♡ この人と仕事したい"}
              </button>
              <p className="text-center text-[11px] text-gray-300 mt-2">
                相手にあなたのプロフィールが通知されます
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
