import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // ログイン成功 → プロフィールが存在するか確認
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        // プロフィール未作成 → 編集画面へ
        if (!profile) {
          return NextResponse.redirect(`${origin}/profile/edit`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // エラー時はトップへ
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
