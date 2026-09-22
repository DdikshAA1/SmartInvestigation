import nodemailer from "nodemailer";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "dikshar1123@gmail.com";

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

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

  if (!transporter) {
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
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "Vanguard Admin Dispatch"}" <${process.env.SMTP_FROM_EMAIL || smtpUser}>`,
      to: recipient,
      subject,
      text,
    });
    console.log(`[Email Alert Sent successfully to ${recipient}]: MessageID: ${info.messageId}`);
  } catch (err) {
    console.error("Failed to send email alert via configured SMTP:", err);
  }
}
