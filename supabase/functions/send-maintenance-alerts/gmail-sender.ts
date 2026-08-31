import nodemailer from 'npm:nodemailer@6.9.16';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendGmailEmail(input: SendEmailInput): Promise<boolean> {
  const user = Deno.env.get('GMAIL_USER')?.trim();
  const pass = Deno.env.get('GMAIL_APP_PASSWORD')?.trim();
  const fromName = Deno.env.get('ALERT_FROM_NAME')?.trim() ?? 'PARTEQUIPOS Alertas';
  const fromEmail = Deno.env.get('ALERT_FROM_EMAIL')?.trim() ?? user;

  if (!user || !pass || !fromEmail) {
    console.log(`[alerta-mock] To=${input.to} Subject=${input.subject}`);
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return true;
  } catch (err) {
    console.error('Gmail send error:', err instanceof Error ? err.message : err);
    return false;
  }
}

/** Resend API (alternativa si no hay Gmail). */
export async function sendResendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const from = Deno.env.get('ALERT_FROM_EMAIL')?.trim() ?? 'alertas@partequipos.com';
  if (!apiKey) return false;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
  });

  return response.ok;
}

export async function sendAlertEmail(input: SendEmailInput): Promise<boolean> {
  const gmailOk = await sendGmailEmail(input);
  if (gmailOk) return true;
  return sendResendEmail(input);
}
