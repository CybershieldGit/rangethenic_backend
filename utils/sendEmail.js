import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const hasSmtpConfig =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (!hasSmtpConfig) {
    console.log('\n==================================================');
    console.log('⚠️  SMTP MAIL SERVER NOT CONFIGURED IN .env');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Reset URL/Text:`);
    console.log(options.text);
    console.log('==================================================\n');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || `"RakaRituals Admin" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
