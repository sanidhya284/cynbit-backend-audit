// app/(marketing)/blog/[slug]/page.tsx
// Observed: /blog/[slug], /careers and /case-studies return
//   Cache-Control: private, no-cache, no-store   x-vercel-cache: MISS   ~300-340 ms
// while prerendered routes (/contact) return a CDN HIT in ~95 ms.
// Content that changes hourly/daily should be statically generated and revalidated.

import { notFound } from "next/navigation";
import { getPostBySlug, getAllSlugs } from "@/lib/content"; // CMS / DB access layer

export const revalidate = 3600;      // regenerate in the background at most hourly
export const dynamicParams = true;   // unknown slugs render on demand, then are cached

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  return <article>{/* ... */}</article>;
}

// app/api/revalidate/route.ts: publish-time cache purge, no waiting for the TTL
// import { revalidateTag } from "next/cache";
// export async function POST(req: Request) {
//   if (req.headers.get("x-revalidate-secret") !== process.env.REVALIDATE_SECRET)
//     return new Response("Unauthorized", { status: 401 });
//   const { tag } = await req.json();
//   revalidateTag(tag);
//   return Response.json({ revalidated: true });
// }
