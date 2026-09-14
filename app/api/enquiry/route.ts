import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";

const TO_EMAIL = "info@ag7cars.com";
const FROM_EMAIL = "AG7 Cars <enquiries@ag7cars.com>";

const enquirySchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(7).max(30),
  city: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(4000),
  intent: z.enum(["buy", "sell"]),
  // Present when the enquiry started from a specific car or live deal
  // page (see the "Enquire Now" / "Claim This Deal" links) — lets the
  // email say exactly which listing someone's asking about.
  listing: z
    .object({
      label: z.string().trim().min(1).max(200),
      url: z.string().trim().url().max(500),
    })
    .optional(),
});

// Emails are rendered as HTML, so any user-supplied text needs
// escaping before interpolation — otherwise a name or message
// containing "<" could inject markup into the message you read.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Subject lines can't contain newlines — strip them rather than
// letting user input smuggle extra header-like lines in.
function toSingleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("[enquiry] RESEND_API_KEY is not configured");
      return NextResponse.json(
        { error: "Enquiries aren't set up yet. Please call or WhatsApp us instead." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = enquirySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please fill in all fields with a valid name, phone, and email." },
        { status: 400 }
      );
    }

    const { name, phone, city, email, message, intent, listing } = parsed.data;

    const intentLabel = intent === "buy" ? "Buy" : "Sell";
    const subject = toSingleLine(
      `${intentLabel} Enquiry${listing ? ` — ${listing.label}` : ""} from ${name}`
    );

    const html = `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; color: #111;">
        <h2 style="margin: 0 0 4px;">New ${intentLabel} Enquiry</h2>
        ${
          listing
            ? `<p style="margin: 0 0 16px; color: #555;">Regarding: <strong>${escapeHtml(listing.label)}</strong><br /><a href="${escapeHtml(listing.url)}">${escapeHtml(listing.url)}</a></p>`
            : ""
        }
        <table style="border-collapse: collapse; width: 100%; margin-top: 8px;">
          <tr><td style="padding: 6px 12px 6px 0; color: #888; width: 90px;">Name</td><td style="padding: 6px 0;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; color: #888;">Phone</td><td style="padding: 6px 0;"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></td></tr>
          <tr><td style="padding: 6px 12px 6px 0; color: #888;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding: 6px 12px 6px 0; color: #888;">City</td><td style="padding: 6px 0;">${escapeHtml(city)}</td></tr>
        </table>
        <p style="margin: 20px 0 4px; color: #888;">Message</p>
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
    `;

    const { error } = await resendClient().emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject,
      html,
    });

    if (error) {
      console.error("[enquiry] Resend failed:", error);
      return NextResponse.json(
        { error: "Couldn't send your enquiry. Please try again or WhatsApp us." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[enquiry] Unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// Constructed lazily (rather than at module scope) so a missing key
// during local dev fails inside the request handler above — which
// returns a clean error — instead of crashing the whole route module
// at build/import time.
function resendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}
