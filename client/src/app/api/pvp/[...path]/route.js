  // client/src/app/api/pvp/[...path]/route.js
  import { NextResponse } from "next/server";

  const API_BASE = process.env.SERVER_BASE_URL || "http://localhost:3001";

  export async function GET(req, { params }) {
    const url = `${API_BASE}/api/pvp/${params.path.join("/")}${req.nextUrl.search}`;
    const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const r = await fetch(url, {
      headers: {
        cookie: req.headers.get("cookie") || "",
        Authorization: auth,
      },
      cache: "no-store",
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  }

  export async function POST(req, { params }) {
    const body = await req.json().catch(() => ({}));
    const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const r = await fetch(`${API_BASE}/api/pvp/${params.path.join("/")}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
        Authorization: auth,
      },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  }

  export async function DELETE(req, { params }) {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const r = await fetch(`${API_BASE}/api/pvp/${params.path.join("/")}`, {
      method: "DELETE",
      headers: {
        cookie: req.headers.get("cookie") || "",
        Authorization: auth,
      },
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  }
