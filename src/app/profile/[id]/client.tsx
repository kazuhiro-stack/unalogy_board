"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProfileWithSkills } from "@/lib/types";

interface Props {
  profile: ProfileWithSkills & { interest_count: number };
  currentUserId: string | null;
}

export function ProfilePageClient({ profile, currentUserId }: Props) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  // 既に送信済みか確認
  useEffect(() => {
    async function checkSent() {
      if (!currentUserId) return;
      const supabase = createClient();
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", currentUserId)
        .single();
      if (!myProfile) return;

      const { data } = await supabase
        .from("interests")
        .select("id")
        .eq("from_profile_id", myProfile.id)
        .eq("to_profile_id", profile.id)
        .single();

      if (data) setSent(true);
    }
    checkSent();
  }, [currentUserId, profile.id]);

  async function sendInterest() {
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
      to_profile_id: profile.id,
      is_anonymous: false,
    });

    if (!error || error.code === "23505") {
      setSent(true);
    }
  }

  function shareProfile() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${profile.name} - ${profile.title}`,
        text: profile.tagline,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const snsEntries = Object.entries(profile.sns_links || {}).filter(
    ([, v]) => v && v.trim() !== ""
  );

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
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← メンバー一覧
          </a>
        </div>
      </header>

      {/* Hero photo */}
      <div className="relative h-64 sm:h-80 bg-gray-100">
        <img
          src={
            profile.photo_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=800&background=e0f2fe&color=0d9488&bold=true`
          }
          alt={profile.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Name overlay */}
        <div className="absolute bottom-6 left-0 right-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-sm">
                {profile.name}
              </h1>
              {profile.is_available && (
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  受付中
                </span>
              )}
            </div>
            <p className="text-white/80 font-medium mt-1 text-sm sm:text-base">
              {profile.title}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Action bar */}
        <div className="flex items-center gap-3 py-5 border-b border-gray-100">
          <button
            onClick={() => {
              if (!sent) sendInterest();
            }}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              sent
                ? "bg-pink-50 text-pink-500 border-2 border-pink-200"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-teal-200/50"
            }`}
          >
            {sent ? "♥ 興味あり済み" : "♡ この人と仕事したい"}
          </button>
          <button
            onClick={shareProfile}
            className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all text-sm font-semibold flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {copied ? "コピーしました！" : "共有"}
          </button>
          {profile.interest_count > 0 && (
            <span className="text-sm text-pink-400 font-semibold flex items-center gap-1 ml-auto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {profile.interest_count}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="py-8 space-y-8">
          {/* Tagline */}
          {profile.tagline && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-6 border-l-4 border-teal-400">
              <p className="text-lg font-bold text-gray-800 leading-relaxed">
                {profile.tagline}
              </p>
            </div>
          )}

          {/* Skills */}
          {profile.skills.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[2px] mb-3">
                スキル
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((s) => (
                    <span
                      key={s.id}
                      className="px-4 py-1.5 bg-teal-50 text-teal-700 text-sm font-semibold rounded-lg"
                    >
                      {s.skill_name}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[2px] mb-3">
                経歴・強み
              </h2>
              <p className="text-gray-600 leading-[1.9] whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Looking for */}
          {profile.looking_for && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[2px] mb-3">
                こんな人と仕事したい
              </h2>
              <p className="text-gray-600 leading-[1.9]">
                {profile.looking_for}
              </p>
            </div>
          )}

          {/* Achievements */}
          {(profile.achievements as string[])?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[2px] mb-3">
                実績
              </h2>
              <div className="space-y-2">
                {(profile.achievements as string[]).map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SNS Links */}
          {snsEntries.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[2px] mb-3">
                リンク
              </h2>
              <div className="flex flex-wrap gap-2">
                {snsEntries.map(([key, value]) => {
                  const url = value.startsWith("http")
                    ? value
                    : key === "x"
                    ? `https://x.com/${value.replace("@", "")}`
                    : key === "github"
                    ? `https://github.com/${value}`
                    : key === "note"
                    ? `https://note.com/${value}`
                    : value;

                  const label =
                    key === "x" ? "X" : key === "note" ? "note" : key === "github" ? "GitHub" : "Web";

                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 font-medium hover:border-teal-300 hover:text-teal-600 transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        </div>

        {/* Bottom CTA */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 py-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <button
            onClick={() => {
              if (!sent) sendInterest();
            }}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
              sent
                ? "bg-pink-50 text-pink-500 border-2 border-pink-200"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-teal-200/50"
            }`}
          >
            {sent ? "♥ 興味ありを送信済み" : "♡ この人と仕事したい"}
          </button>
        </div>
      </div>

      {/* Footer spacer */}
      <div className="h-4" />
    </div>
  );
}
