import nodemailer from "nodemailer";

/** O envio fica ativo quando host e remetente estão configurados. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_SMTP_HOST && process.env.EMAIL_FROM);
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const host = process.env.EMAIL_SMTP_HOST;
  const from = process.env.EMAIL_FROM;
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;

  if (!host || !from) return false;

  const port = Number(process.env.EMAIL_SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({ from, to, subject, text });
  return true;
}
