import { NextResponse } from "next/server";
import { isEmail, makeId, readJsonBody, readList, textField, writeList } from "@/lib/json-store";
import { rateLimit } from "@/lib/rate-limit";
import { CONTACT_EMAIL } from "@/lib/site";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

const STORE = "contact/messages";
const MAX_MESSAGES = 500;

export async function POST(req: Request) {
  const limited = rateLimit(req, "contact");
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const name = textField(body.name, 100);
  const email = textField(body.email, 140);
  const subject = textField(body.subject, 140) || "General Inquiry";
  const message = textField(body.message, 3000);

  if (name.length < 2) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: "Please write a message of at least 10 characters." },
      { status: 400 }
    );
  }

  const entry: ContactMessage = {
    id: makeId("msg"),
    name,
    email,
    subject,
    message,
    createdAt: new Date().toISOString(),
  };

  try {
    writeList(STORE, [entry, ...readList<ContactMessage>(STORE)].slice(0, MAX_MESSAGES));
  } catch (err) {
    console.error("contact", err);
    return NextResponse.json(
      { error: `Could not save your message. Please write to ${CONTACT_EMAIL} instead.` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      id: entry.id,
      message: `Message received! You can also write directly to ${CONTACT_EMAIL}.`,
    },
    { status: 201 }
  );
}
