import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  email: string,
  token: string,
  schoolName: string
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/claim/verify?token=${token}`;

  await resend.emails.send({
    from: "Flight School Directory <noreply@example.com>", // TODO(question): What should the from address be?
    to: email,
    subject: `Verify your claim for ${schoolName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Verify Your School Claim</h1>
        <p>Hello,</p>
        <p>You've requested to claim <strong>${schoolName}</strong> in the Flight School Directory.</p>
        <p>Click the link below to verify your email address and complete the claim:</p>
        <p style="margin: 20px 0;">
          <a href="${verifyUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Claim
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  });
}
