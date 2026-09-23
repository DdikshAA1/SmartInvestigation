import nodemailer from "nodemailer";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "dikshar1123@gmail.com";
export const EMAIL_API_KEY = process.env.EMAIL_API_KEY;

const smtpHost = process.env.SMTP_HOST || "smtp-relay.brevo.com";
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER || "dikshar1123@gmail.com";
const smtpPass = process.env.SMTP_PASS || EMAIL_API_KEY;

let transporter: nodemailer.Transporter | null = null;

if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function sendEmailNotification(subject: string, text: string) {
  const recipient = ADMIN_EMAIL;
  console.log(`[ADMIN NOTIFICATION TO ${recipient}]: ${subject}\nContent:\n${text}`);

  // 1. Try Brevo / HTTP Email API first if EMAIL_API_KEY is configured
  const apiKey = process.env.EMAIL_API_KEY || EMAIL_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "Vanguard Admin Alert", email: smtpUser },
          to: [{ email: recipient }],
          subject: subject,
          textContent: text,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        console.log(`[Brevo Email Sent to ${recipient}]: Message ID ${data.messageId}`);
        return;
      } else {
        const errText = await res.text();
        console.warn(`Brevo API returned ${res.status}: ${errText}, attempting SMTP fallback...`);
      }
    } catch (e) {
      console.warn("Brevo HTTP API dispatch failed, trying SMTP fallback...", e);
    }
  }

  // 2. Try configured SMTP transporter fallback
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || "Vanguard Admin Dispatch"}" <${process.env.SMTP_FROM_EMAIL || smtpUser}>`,
        to: recipient,
        subject,
        text,
      });
      console.log(`[Email Alert Sent via SMTP to ${recipient}]: MessageID: ${info.messageId}`);
      return;
    } catch (err) {
      console.error("Failed to send email alert via configured SMTP:", err);
    }
  }

  // 3. Fallback to Ethereal mock SMTP test account for development/preview
  try {
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    const info = await testTransporter.sendMail({
      from: '"Vanguard Admin Dispatch" <no-reply@vanguard-intel.com>',
      to: recipient,
      subject,
      text,
    });
    console.log(`[Email Alert Sent (Ethereal test)]: Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (e) {
    console.error("Failed to send email alert via mock Ethereal SMTP:", e);
  }
}
