import type { APIRoute } from "astro";
import { anonClient } from "../lib/supabase";

export const prerender = false;

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const GET: APIRoute = async () => {
  const sb = anonClient();
  let pages: { title: string; body_html: string | null }[] = [];
  if (sb) {
    const { data } = await sb
      .from("pages")
      .select("title, body_html")
      .not("published_at", "is", null);
    pages = data ?? [];
  }

  const body = pages
    .map((p) => `# ${p.title}\n\n${stripHtml(p.body_html ?? "")}\n\n---\n`)
    .join("\n");

  return new Response(body || "# Meridian\n\nMeridian is a specialty coffee brand launching soon.\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
