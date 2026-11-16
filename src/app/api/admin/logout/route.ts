import { sameOrigin, SESSION_COOKIE } from "@/lib/admin/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin." }, { status: 403 });
  const res = Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`);
  return res;
}
