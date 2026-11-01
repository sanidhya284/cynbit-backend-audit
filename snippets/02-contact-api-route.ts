// app/api/contact/route.ts
// Replaces the plain `mailto:` links with a validated, rate-limited endpoint.
// Deps: npm i zod @upstash/ratelimit @upstash/redis resend

import { NextResponse } from "next/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = new Set(["https://www.cynbit.in", "https://cynbit.in"]);

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  message: z.string().trim().min(10).max(2000),
  company: z.string().max(0).optional(), // honeypot: real users leave it empty
});

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10 m"), // 5 submissions / 10 min / IP
  prefix: "contact",
});

// RFC 9457 / 7807 "problem details" keeps error shapes consistent for clients.
const problem = (status: number, title: string, extra: object = {}, headers: HeadersInit = {}) =>
  NextResponse.json(
    { type: "about:blank", title, status, ...extra },
    { status, headers: { "Content-Type": "application/problem+json", ...headers } },
  );

export async function POST(req: Request) {
  // 1. Basic CSRF / abuse guard: same-site origin only
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return problem(403, "Forbidden origin");

  // 2. Rate limit before doing any real work
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success, reset } = await ratelimit.limit(ip);
  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return problem(429, "Too many requests", {}, { "Retry-After": String(retryAfter) });
  }

  // 3. Parse + validate (reject oversized bodies early)
  const raw = await req.text();
  if (raw.length > 10_000) return problem(413, "Payload too large");
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return problem(400, "Malformed JSON"); }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return problem(422, "Validation failed", { errors: parsed.error.flatten().fieldErrors });
  }
  if (parsed.data.company) return NextResponse.json({ ok: true }); // silently drop bots

  // 4. Deliver; never leak provider errors to the client
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Cynbit Website <no-reply@cynbit.in>",
      to: "opportunities@cynbit.in",
      replyTo: parsed.data.email,
      subject: `New enquiry from ${parsed.data.name}`,
      text: parsed.data.message,
    });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err) {
    console.error("contact_send_failed", { ip, err }); // structured log, no PII body
    return problem(502, "Could not deliver message, please try again later");
  }
}
