"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Skill, SkillCategory } from "@/lib/types";

export default function ProfileEditPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [categories, setCategories] = useState<SkillCategory[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [achievementsText, setAchievementsText] = useState("");
  const [snsLinks, setSnsLinks] = useState<Record<string, string>>({
    x: "",
    note: "",
    github: "",
    website: "",
  });
  const [skillsText, setSkillsText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
    loadCategories();
  }, []);

  async function loadCategories() {
    const { data } = await supabase
      .from("skill_categories")
      .select("*")
      .order("display_order");
    if (data) setCategories(data);
  }

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, skills(*)")
      .eq("auth_user_id", user.id)
      .single();

    if (profile) {
      setName(profile.name);
      setTitle(profile.title);
      setTagline(profile.tagline);
      setBio(profile.bio);
      setLookingFor(profile.looking_for);
      setIsAvailable(profile.is_available);
      // コンマ区切りテキストに変換
      setAchievementsText(
        (profile.achievements as string[])
          .filter((a: string) => a.trim() !== "")
          .join("、"),
      );
      setSnsLinks({
        x: "",
        note: "",
        github: "",
        website: "",
        ...profile.sns_links,
      });
      setSkillsText(
        profile.skills
          .sort((a: Skill, b: Skill) => a.display_order - b.display_order)
          .map((s: Skill) => s.skill_name)
          .join("、"),
      );
      if (profile.photo_url) setPhotoPreview(profile.photo_url);
    } else {
      setIsNew(true);
      setName(user.user_metadata?.full_name || "");
      if (user.user_metadata?.avatar_url) {
        setPhotoPreview(user.user_metadata.avatar_url);
      }
    }

    setLoading(false);
  }

  // コンマ区切りテキストを配列に変換（全角・半角コンマ両対応）
  function parseCommaSeparated(text: string): string[] {
    return text
      .split(/[,、，]/)
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }

  async function handleSave() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 写真アップロード
    let photoUrl = photoPreview;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, photoFile, { upsert: true });

      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);
        photoUrl = publicUrl;
      }
    }

    const achievements = parseCommaSeparated(achievementsText);
    const skills = parseCommaSeparated(skillsText);

    const profileData = {
      auth_user_id: user.id,
      name,
      title,
      tagline,
      bio,
      looking_for: lookingFor,
      photo_url: photoUrl,
      achievements,
      sns_links: Object.fromEntries(
        Object.entries(snsLinks).filter(([, v]) => v.trim() !== ""),
      ),
      is_available: isAvailable,
    };

    let profileId: string;

    if (isNew) {
      const { data, error } = await supabase
        .from("profiles")
        .insert(profileData)
        .select("id")
        .single();
      if (error || !data) {
        alert("プロフィールの作成に失敗しました: " + error?.message);
        setSaving(false);
        return;
      }
      profileId = data.id;
    } else {
      const { data, error } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("auth_user_id", user.id)
        .select("id")
        .single();
      if (error || !data) {
        alert("プロフィールの更新に失敗しました: " + error?.message);
        setSaving(false);
        return;
      }
      profileId = data.id;

      // 既存スキルを削除
      await supabase.from("skills").delete().eq("profile_id", profileId);
    }

    // スキルを再登録
    const skillRows = skills.map((s, i) => ({
      profile_id: profileId,
      skill_name: s,
      display_order: i,
    }));

    if (skillRows.length > 0) {
      await supabase.from("skills").insert(skillRows);
    }

    setSaving(false);
    router.push("/");
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-300 focus:border-teal-300 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all";
  const labelClass = "block text-sm font-bold text-gray-600 mb-1.5";
  const hintClass = "text-[11px] text-gray-300 mt-1";

  // スキルのプレビュー表示
  const skillPreview = parseCommaSeparated(skillsText);
  const achievementPreview = parseCommaSeparated(achievementsText);

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900 hidden sm:block">
              TalentBoard
            </span>
          </a>
          <a
            href="/"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← メンバー一覧に戻る
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
          {isNew ? "プロフィールを作成" : "プロフィールを編集"}
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          {isNew
            ? "コミュニティに参加するためのプロフィールを作成しましょう"
            : "プロフィール情報を更新できます"}
        </p>

        <div className="space-y-6">
          {/* ===== Photo Upload ===== */}
          <div>
            <label className={labelClass}>プロフィール写真</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer group"
            >
              <div className="flex items-center gap-5 p-4 bg-white border border-gray-200 border-dashed rounded-xl hover:border-teal-300 hover:bg-teal-50/30 transition-all">
                {/* Preview */}
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-white shadow-sm">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <svg
                      className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </div>

                {/* Upload text */}
                <div>
                  <p className="text-sm font-semibold text-gray-600 group-hover:text-teal-600 transition-colors">
                    {photoPreview ? "写真を変更する" : "写真をアップロード"}
                  </p>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    JPG, PNG — 推奨サイズ 400×400px 以上
                  </p>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          {/* ===== Name ===== */}
          <div>
            <label className={labelClass}>
              名前 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="尾田 和啓"
              className={inputClass}
            />
          </div>

          {/* ===== Title ===== */}
          <div>
            <label className={labelClass}>
              肩書き <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="UNALOGY代表 / AI×営業コンサルタント"
              className={inputClass}
            />
          </div>

          {/* ===== Tagline ===== */}
          <div>
            <label className={labelClass}>キャッチコピー</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="売れる仕組みを、AIで加速させる"
              className={inputClass}
            />
            <p className={hintClass}>
              一覧カードに表示されます。30文字以内がおすすめ
            </p>
          </div>

          {/* ===== Bio ===== */}
          <div>
            <label className={labelClass}>経歴・自己紹介</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="これまでの経歴や得意なことを書いてください"
              className={inputClass + " resize-none"}
            />
          </div>

          {/* ===== Looking for ===== */}
          <div>
            <label className={labelClass}>こんな人と仕事したい</label>
            <textarea
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              rows={2}
              placeholder="どんな人と一緒に仕事したいですか？"
              className={inputClass + " resize-none"}
            />
          </div>

          {/* ===== Skills (comma separated) ===== */}
          <div>
            <label className={labelClass}>スキル</label>
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="法人営業、IS構築、AI活用支援、M&A支援、財務DD"
              className={inputClass}
            />
            <p className={hintClass}>
              読点（、）またはカンマ（,）で区切って入力してください
            </p>
            {/* Preview tags */}
            {skillPreview.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {skillPreview.map((s, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 bg-teal-50 text-teal-600 text-xs font-semibold rounded-md"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ===== Achievements (comma separated) ===== */}
          <div>
            <label className={labelClass}>実績</label>
            <input
              type="text"
              value={achievementsText}
              onChange={(e) => setAchievementsText(e.target.value)}
              placeholder="IS部門ゼロ→構築 アポ率10%達成、M&A年間10件+のDD実績、堂島取引所 最年少課長"
              className={inputClass}
            />
            <p className={hintClass}>
              読点（、）またはカンマ（,）で区切って入力してください
            </p>
            {/* Preview */}
            {achievementPreview.length > 0 && (
              <div className="space-y-1.5 mt-2.5">
                {achievementPreview.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                    {a}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===== SNS ===== */}
          <div>
            <label className={labelClass}>SNS・リンク</label>
            <div className="space-y-2">
              {Object.entries(snsLinks).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16 text-right font-medium">
                    {key === "x"
                      ? "X"
                      : key === "note"
                        ? "note"
                        : key === "github"
                          ? "GitHub"
                          : "Web"}
                  </span>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) =>
                      setSnsLinks({ ...snsLinks, [key]: e.target.value })
                    }
                    placeholder={`${key}のURL or ID`}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ===== Available toggle ===== */}
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
            <div>
              <p className="text-sm font-bold text-gray-700">案件受付中</p>
              <p className="text-[11px] text-gray-300 mt-0.5">
                ONにすると一覧に「受付中」バッジが表示されます
              </p>
            </div>
            <button
              onClick={() => setIsAvailable(!isAvailable)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                isAvailable ? "bg-emerald-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                  isAvailable ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* ===== Save button ===== */}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !title.trim()}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 
                       text-white font-bold text-base rounded-xl
                       hover:from-emerald-600 hover:to-teal-600 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 shadow-lg shadow-teal-200/50 hover:shadow-xl"
          >
            {saving
              ? "保存中..."
              : isNew
                ? "プロフィールを作成する"
                : "変更を保存する"}
          </button>

          {!isNew && (
            <p className="text-center text-[11px] text-gray-300">
              ※ 管理者による承認後、一覧に表示されます
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
