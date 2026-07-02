import nodemailer from 'nodemailer';

const getMailConfig = () => {
  const host = process.env.MAIL_HOST || process.env.SMTP_HOST;
  const port = parseInt(process.env.MAIL_PORT || process.env.SMTP_PORT, 10) || 587;
  const user = process.env.MAIL_USER || process.env.SMTP_USER;
  const pass = process.env.MAIL_PASS || process.env.SMTP_PASS;
  const secure =
    process.env.MAIL_SECURE === 'true' || parseInt(process.env.SMTP_PORT, 10) === 465;
  const fromName = process.env.MAIL_FROM_NAME || 'Rangethnics';
  const fromEmail = process.env.MAIL_FROM_EMAIL || user;

  return { host, port, user, pass, secure, fromName, fromEmail };
};

const sendEmail = async (options) => {
  const { host, port, user, pass, secure, fromName, fromEmail } = getMailConfig();
  const hasSmtpConfig = host && user && pass;

  if (!hasSmtpConfig) {
    console.log('\n==================================================');
    console.log('⚠️  MAIL SERVER NOT CONFIGURED IN .env');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('Message:');
    console.log(options.text);
    console.log('==================================================\n');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail || user}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

const sendOtpEmail = async ({ to, otp, purpose }) => {
  const storeName = process.env.MAIL_FROM_NAME || 'Rangethnics';
  const expiresMinutes = Math.ceil((parseInt(process.env.OTP_EXPIRES_IN, 10) || 300) / 60);
  const action =
    purpose === 'signup'
      ? 'complete your registration'
      : 'reset your password';

  const subject = `${storeName} - Your verification code`;
  const text = `Your ${storeName} verification code is ${otp}. Use this code to ${action}. This code expires in ${expiresMinutes} minutes.`;
  const html = `
    <div style="font-family: Georgia, serif; color: #420001; max-width: 480px; margin: 0 auto;">
      <h2 style="margin-bottom: 8px;">Verify your email</h2>
      <p style="color: #7a6e67; line-height: 1.6;">
        Use the code below to ${action} on ${storeName}.
      </p>
      <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 24px 0;">${otp}</p>
      <p style="color: #7a6e67; font-size: 14px;">
        This code expires in ${expiresMinutes} minutes. If you did not request this, you can ignore this email.
      </p>
    </div>
  `;

  await sendEmail({ to, subject, text, html });
};

export default sendEmail;
export { sendOtpEmail };
