import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const REPLY_TO = process.env.RESEND_REPLY_TO;

// Constructed lazily: `new Resend(undefined)` throws at module load, which
// would break builds/environments where the env var isn't set.
let client: Resend | null = null;

// Resend's SDK never throws - failures come back as { data: null, error }.
// Wrap it so callers' try/catch actually sees failures; otherwise email_logs
// records "sent" for emails that never went out.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured - email not sent");
  }
  client ??= new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await client.emails.send({
    from: opts.from ?? FROM,
    replyTo: opts.replyTo ?? REPLY_TO,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    throw new Error(`Resend ${error.name}: ${error.message}`);
  }
  return data;
}
