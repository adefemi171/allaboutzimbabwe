import { NextResponse } from "next/server";
import { isEmail, makeId, readJsonBody, readList, textField, writeList } from "@/lib/json-store";
import { rateLimit } from "@/lib/rate-limit";

interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
}

const STORE = "newsletter/subscribers";
const MAX_SUBSCRIBERS = 20000;

export async function POST(req: Request) {
  const limited = rateLimit(req, "newsletter");
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const email = textField(body.email, 140).toLowerCase();
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const existing = readList<Subscriber>(STORE);
  if (existing.some((s) => s.email === email)) {
    return NextResponse.json({
      ok: true,
      message: "You are already subscribed to the All About Zimbabwe newsletter.",
    });
  }
  if (existing.length >= MAX_SUBSCRIBERS) {
    return NextResponse.json(
      { error: "Sign-ups are paused right now. Please try again later." },
      { status: 503 }
    );
  }

  const entry: Subscriber = { id: makeId("sub"), email, createdAt: new Date().toISOString() };

  try {
    writeList(STORE, [entry, ...existing]);
  } catch (err) {
    console.error("newsletter", err);
    return NextResponse.json({ error: "Could not subscribe right now." }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      id: entry.id,
      message: "Subscribed! Welcome to the All About Zimbabwe dispatch.",
    },
    { status: 201 }
  );
}
