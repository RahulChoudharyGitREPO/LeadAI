const { Resend } = require('resend');
const SupportMessage = require('../models/SupportMessage');

const resend = new Resend(process.env.RESEND_API_KEY);
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'rahulrajwwe2@gmail.com';

async function sendSupportMessage(req, res) {
  const userId = req.headers['x-user-id'];
  const { name, email, subject, message } = req.body;

  if (!message || message.trim().length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters.' });
  }

  // Save to DB first so it's always visible in admin even if email fails
  const doc = await SupportMessage.create({ userId, name, email, subject, message });

  // Send email (non-blocking — don't fail the request if email fails)
  resend.emails.send({
    from: 'ClientStream Support <onboarding@resend.dev>',
    to: CONTACT_EMAIL,
    subject: `[Support] ${subject || 'No subject'} — ${name || userId || 'Unknown'}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">New Support Request</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b; width: 100px;">From</td><td style="padding: 8px;">${name || '—'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Email</td><td style="padding: 8px;">${email || '—'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">User ID</td><td style="padding: 8px; font-size: 12px; color: #94a3b8;">${userId || '—'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Subject</td><td style="padding: 8px;">${subject || '—'}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #facc15;">
          <p style="margin: 0; white-space: pre-wrap; color: #1e293b;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Sent from ClientStream dashboard · Message ID: ${doc._id}</p>
      </div>
    `,
  }).catch(err => console.error('Resend error:', err));

  res.json({ success: true });
}

module.exports = { sendSupportMessage };
