import type { APIRoute } from "astro";
import { anonClient } from "../../lib/supabase";
import { sendSubscriberWelcome } from "../../lib/email";
import { hitOrReject } from "../../lib/rate-limit";

export const prerender = false;

function isJson(request: Request) {
  return (request.headers.get("content-type") ?? "").includes("application/json");
}

export const POST: APIRoute = async ({ request }) => {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const rl = hitOrReject(ip);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests — please try again in a minute." }), {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec), "Content-Type": "application/json" },
    });
  }

  let body: Record<string, any>;
  try {
    if (isJson(request)) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid form submission." }), { status: 400 });
  }

  // HONEYPOT — fake success
  if (body.website) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // TIMING
  const age = Date.now() - Number(body.renderedAt ?? 0);
  if (age < 3000 || age > 24 * 60 * 60 * 1000) {
    return new Response(JSON.stringify({ error: "Form expired — please reload the page and try again." }), { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Please enter a valid email address." }), { status: 400 });
  }

  const sb = anonClient();
  if (!sb) {
    return new Response(JSON.stringify({ error: "Server not configured. Please try again shortly." }), { status: 500 });
  }

  const { error } = await sb.from("subscribers").insert({ email, source_ip: ip });
  // Ignore unique-violation errors (already subscribed) — still treat as success.
  if (error && error.code !== "23505") {
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), { status: 500 });
  }

  await sendSubscriberWelcome({ to: email }).catch(() => {});

  if (isJson(request)) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return new Response(null, { status: 303, headers: { Location: "/thank-you" } });
};
