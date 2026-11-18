/**
 * Reader reports. Every submission is saved to data/feedback.json with status
 * "received" and stays private. To publish one on /feedback, edit that file and
 * set its status to "approved"; the public GET returns approved entries only,
 * and never the submitter's email address.
 */
import { NextResponse } from "next/server";
import {
  DEFAULT_FEEDBACK_TOPIC,
  isFeedbackCategory,
  type FeedbackCategory,
} from "@/lib/feedback";
import { isEmail, makeId, readJsonBody, readList, textField, writeList } from "@/lib/json-store";
import { rateLimit } from "@/lib/rate-limit";

interface FeedbackSubmission {
  id: string;
  pageUrl: string;
  category: FeedbackCategory;
  provinceOrTopic: string;
  message: string;
  contactEmail?: string;
  createdAt: string;
  status: "received" | "approved";
}

const STORE = "feedback";
const MAX_SUBMISSIONS = 500;
const PUBLIC_LIMIT = 50;

/** The fields safe to show publicly; listed explicitly so the email can never leak. */
function toPublic(s: FeedbackSubmission) {
  return {
    id: s.id,
    pageUrl: s.pageUrl,
    category: s.category,
    provinceOrTopic: s.provinceOrTopic,
    message: s.message,
    createdAt: s.createdAt,
    status: s.status,
  };
}

export async function GET() {
  const approved = readList<FeedbackSubmission>(STORE).filter((s) => s.status === "approved");
  return NextResponse.json({
    count: approved.length,
    submissions: approved.slice(0, PUBLIC_LIMIT).map(toPublic),
  });
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "feedback");
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const message = textField(body.message, 2000);
  const contactEmail = textField(body.contactEmail, 120);

  if (message.length < 5) {
    return NextResponse.json(
      { error: "Please include at least 5 characters describing what needs fixing." },
      { status: 400 }
    );
  }
  if (contactEmail && !isEmail(contactEmail)) {
    return NextResponse.json(
      { error: "Please enter a valid email address, or leave it empty." },
      { status: 400 }
    );
  }

  const entry: FeedbackSubmission = {
    id: makeId("fb"),
    pageUrl: textField(body.pageUrl, 200) || "/",
    category: isFeedbackCategory(body.category) ? body.category : "wrong-info",
    provinceOrTopic: textField(body.provinceOrTopic, 100) || DEFAULT_FEEDBACK_TOPIC,
    message,
    contactEmail: contactEmail || undefined,
    createdAt: new Date().toISOString(),
    status: "received",
  };

  try {
    writeList(STORE, [entry, ...readList<FeedbackSubmission>(STORE)].slice(0, MAX_SUBMISSIONS));
  } catch (err) {
    console.error("feedback", err);
    return NextResponse.json({ error: "Could not save your report." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submission: toPublic(entry) }, { status: 201 });
}
