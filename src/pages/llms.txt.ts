import type { APIRoute } from "astro";
import { anonClient } from "../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async () => {
  const SITE = (import.meta.env.PUBLIC_SITE_URL ?? "https://meridian.coffee").replace(/\/$/, "");
  const sb = anonClient();

  let pages: { slug: string; title: string; meta_description: string | null }[] = [];
  if (sb) {
    const { data } = await sb
      .from("pages")
      .select("slug, title, meta_description")
      .not("published_at", "is", null);
    pages = data ?? [];
  }

  const lines: string[] = [];
  lines.push(`# Meridian`);
  lines.push("");
  lines.push(`> Meridian is a specialty coffee brand launching soon — small-batch roasted, origin-transparent, coffee at the edge of dawn.`);
  lines.push("");
  lines.push("## Key pages");
  lines.push("");
  const known: Record<string, string> = { home: "", story: "story", "thank-you": "thank-you", "privacy-policy": "privacy-policy" };
  for (const p of pages) {
    const path = known[p.slug] ?? p.slug;
    lines.push(`- [${p.title}](${SITE}/${path}): ${p.meta_description ?? ""}`);
  }
  if (pages.length === 0) {
    lines.push(`- [Meridian — Specialty Coffee, Launching Soon](${SITE}/): Meridian is a new specialty coffee brand launching soon. Join the list for early access, founder stories, and launch-day discounts.`);
    lines.push(`- [The Meridian Story](${SITE}/story): Discover the founders, sourcing philosophy, and craft behind Meridian.`);
    lines.push(`- [Privacy Policy](${SITE}/privacy-policy): How Meridian collects and stores email signups via Supabase.`);
  }
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
