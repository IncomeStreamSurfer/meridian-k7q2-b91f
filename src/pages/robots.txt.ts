import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = () => {
  const SITE = (import.meta.env.PUBLIC_SITE_URL ?? "https://meridian.coffee").replace(/\/$/, "");
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${SITE}/sitemap-index.xml
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
