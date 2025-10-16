const nodemailer = require("nodemailer");

// Environment variables (set in Backend/.env)
//   GMAIL_USER=youraddress@gmail.com
//   GMAIL_APP_PASSWORD=your_app_password   // 16-char app password (2FA required)
//   APP_NAME=Your App Name (optional, defaults below)
//   FRONTEND_URL=http://localhost:5173 (optional)
//   REPLY_TO=support@yourdomain.com (optional)
//   GMAIL_SMTP_PORT=465 or 587 (optional)
const FROM_EMAIL = process.env.GMAIL_USER || "";
const APP_NAME = process.env.APP_NAME || "Library Management";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const REPLY_TO = process.env.REPLY_TO || undefined;

// Lazily initialized transporter so the app can boot even if email is not configured.
let transporter = null;
let transporterVerified = false;

function buildTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    // Defer failure to send time; this lets the server run without mail creds.
    return null;
  }

  // Prefer explicit SMTP config for Gmail. App passwords require SMTP (not OAuth).
  const port = Number(process.env.GMAIL_SMTP_PORT) || 465; // 465 = SSL, 587 = STARTTLS
  const secure = port === 465;

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port,
    secure,
    auth: { user, pass },
    // Connection pooling keeps SMTP connections warm for multiple messages.
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    // Ensure modern TLS. Do not disable certificate verification in production.
    tls: { minVersion: "TLSv1.2" },
  });
}

async function ensureTransporter() {
  if (!transporter) {
    transporter = buildTransporter();
  }
  if (!transporter) {
    return { ok: false, reason: "missing-creds" };
  }
  if (transporterVerified) {
    return { ok: true };
  }
  try {
    await transporter.verify();
    transporterVerified = true;
    return { ok: true };
  } catch (err) {
    // Provide actionable hints
    const hints = [];
    if (err?.code === "EAUTH") {
      hints.push(
        "EAUTH: Authentication failed. Use a Gmail App Password (account must have 2FA).",
        "Ensure GMAIL_USER matches the Gmail account of the app password."
      );
    }
    if (/Invalid login/i.test(err?.message || "")) {
      hints.push("Invalid login: Double-check GMAIL_USER and GMAIL_APP_PASSWORD.");
    }
    if (/534-5.7.14/i.test(err?.response || "")) {
      hints.push("Google blocked sign-in. Confirm that you are using an App Password, not your normal password.");
    }
    console.error("Email transport verify failed:", err?.message || err, hints.length ? `\nHints:\n- ${hints.join("\n- ")}` : "");
    return { ok: false, reason: "verify-failed", error: err };
  }
}

async function sendEmail({ to, subject, html, text }) {
  // Fail fast if credentials are missing
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn(
      "Email not sent: missing GMAIL_USER or GMAIL_APP_PASSWORD in environment."
    );
    return { skipped: true };
  }

  const ready = await ensureTransporter();
  if (!ready.ok) {
    return {
      success: false,
      error:
        ready.reason === "verify-failed"
          ? `Email transport verification failed: ${ready.error?.message || "unknown error"}`
          : "Email transport not available (missing credentials)"
    };
  }

  // Gmail requires From to match authenticated user. We set the display name to APP_NAME.
  const mailOptions = {
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html, // Your beautiful HTML email
    text: text || undefined, // Plain text version
    text: text || undefined,
    replyTo: REPLY_TO || undefined,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Gmail sent successfully to ${to}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, accepted: info.accepted };
  } catch (err) {
    const hints = [];
    if (err?.code === "EAUTH") {
      hints.push("Check GMAIL_USER and GMAIL_APP_PASSWORD (use an App Password with 2FA).");
    }
    if (err?.code === "ESOCKET") {
      hints.push("Network issue reaching smtp.gmail.com. Check outbound connectivity and firewall.");
    }
    if (/Invalid login/i.test(err?.message || "")) {
      hints.push("Invalid login: App Password likely incorrect or revoked.");
    }
    console.error("Email send failed:", err?.message || err, hints.length ? `\nHints:\n- ${hints.join("\n- ")}` : "");
    return { success: false, error: err.message };
  }
}

// ---------- Templates ----------
function baseTemplate({ title, body, ctaText, ctaHref }) {
  const cta =
    ctaText && ctaHref
      ? `<a href="${ctaHref}" style="display:inline-block;padding:12px 18px;background:#009966;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">${ctaText}</a>`
      : "";
  return `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f6fffb;padding:24px;color:#0f172a">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d1fae5;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#ecfff7,#f7fffb);padding:20px 24px;border-bottom:1px solid #a7f3d0">
        <h1 style="margin:0;font-size:22px;color:#065f46">${APP_NAME}</h1>
      </div>
      <div style="padding:24px">
        <h2 style="margin:0 0 8px 0;font-size:20px;color:#065f46">${title}</h2>
        <div style="font-size:14px;line-height:1.7;color:#334155">${body}</div>
        ${cta ? `<div style="margin-top:18px">${cta}</div>` : ""}
      </div>
      <div style="padding:16px 24px;background:#f9fafb;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0">
        <div>Need help? Reply to this email.</div>
        <div style="margin-top:6px">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</div>
      </div>
    </div>
  </div>`;
}

function registrationTemplate(user) {
  const title = `Welcome to ${APP_NAME}, ${user?.name?.split(" ")[0] || "Reader"}!`;
  const body = `
    <p>✅ Your account has been created successfully.</p>
    <p>With your new account, you can:</p>
    <ul>
      <li>📚 Browse and borrow books</li>
      <li>⭐ Leave reviews and ratings</li>
      <li>📅 Track due dates and returns</li>
    </ul>
    <p style="margin-top:12px">Start exploring the library now.</p>
  `;
  return {
    subject: `📚 Welcome to ${APP_NAME}!`,
    html: baseTemplate({
      title,
      body,
      ctaText: "Open Library",
      ctaHref: `${FRONTEND_URL}/browsebooks`,
    }),
    // Auto-generated plain text version for compatibility
    text: `Welcome to ${APP_NAME}, ${user?.name?.split(" ")[0] || "Reader"}!
Your account has been created successfully.
Start exploring the library now: ${FRONTEND_URL}/browsebooks`,
  };
}

function paymentSubmittedTemplate(user, payment) {
  const title = `Payment Submitted – Pending Review`;
  const body = `
    <p>Hi ${user?.name?.split(" ")[0] || "there"},</p>
    <p>We received your membership payment submission with reference <b>${payment?.reference || "N/A"}</b>.</p>
    <p>Status: <b>Pending</b> ⏳</p>
    <p>We will review it shortly and notify you once it's approved or if more info is required.</p>
  `;
  return {
    subject: `🧾 Payment Received (Pending)`,
    html: baseTemplate({
      title,
      body,
      ctaText: "View Payment Status",
      ctaHref: `${FRONTEND_URL}/membershippayment`,
    }),
  };
}

function paymentStatusTemplate(user, payment) {
  const st = payment?.status;
  let emoji = "ℹ️";
  if (st === "Approved") emoji = "✅";
  else if (st === "Rejected") emoji = "❌";
  const title = `Membership Payment ${st}`;
  const extra =
    st === "Approved"
      ? "Your membership is now active. You can borrow up to 3 books."
      : "Unfortunately, your payment was not approved. You may resubmit with a valid screenshot/reference."; // prettier-ignore
  const body = `
    <p>Hi ${user?.name?.split(" ")[0] || "there"},</p>
    <p>Your membership payment (reference <b>${payment?.reference || "N/A"}</b>) has been <b>${st}</b> ${st === "Approved" ? "🎉" : ""}</p>
    <p>${extra}</p>
  `;
  return {
    subject: `${emoji} Payment ${st}`,
    html: baseTemplate({
      title,
      body,
      ctaText: st === "Approved" ? "Browse Books" : "Resubmit Payment",
      ctaHref:
        st === "Approved"
          ? `${FRONTEND_URL}/browsebooks`
          : `${FRONTEND_URL}/membershippayment`,
    }),
  };
}

function borrowConfirmationTemplate(user, borrow, book) {
  const title = `Borrowed: ${book?.title || "Book"}`;
  const body = `
    <p>Hi ${user?.name?.split(" ")[0] || "there"},</p>
    <p>You borrowed <b>${book?.title || "a book"}</b> by ${book?.author || "an unknown author"}.</p>
    <p>Due Date: <b>${borrow?.dueDate ? new Date(borrow.dueDate).toLocaleDateString() : "N/A"}</b></p>
    <p>Please return on time to avoid overdue status.</p>
  `;
  return {
    subject: `📘 Borrowed: ${book?.title || "Book"}`,
    html: baseTemplate({
      title,
      body,
      ctaText: "View My Books",
      ctaHref: `${FRONTEND_URL}/mybooks`,
    }),
  };
}

function returnRequestedTemplate(user, borrow, book) {
  const title = `Return Requested – Pending Approval`;
  const body = `
    <p>Hi ${user?.name?.split(" ")[0] || "there"},</p>
    <p>Your return request for <b>${book?.title || "a book"}</b> has been submitted.</p>
    <p>Status: <b>Pending</b> ⏳ — a librarian will review and approve shortly.</p>
  `;
  return {
    subject: `↩️ Return Requested (Pending)`,
    html: baseTemplate({
      title,
      body,
      ctaText: "Track Request",
      ctaHref: `${FRONTEND_URL}/mybooks`,
    }),
  };
}

function returnApprovedTemplate(user, borrow, book) {
  const isOverdue = borrow?.status === "Overdue";
  const title = isOverdue
    ? `Return Approved – Marked Overdue`
    : `Return Approved – Thank You!`;
  const body = `
    <p>Hi ${user?.name?.split(" ")[0] || "there"},</p>
    <p>Your return request for <b>${book?.title || "a book"}</b> has been <b>approved</b>.</p>
    ${isOverdue ? '<p>Note: This book was returned past its due date and has been marked as <b>Overdue</b>.</p>' : ''}
    <p>We look forward to your next read!</p>
  `;
  return {
    subject: `${isOverdue ? "⏰" : "✅"} Return Approved`,
    html: baseTemplate({
      title,
      body,
      ctaText: "Browse Books",
      ctaHref: `${FRONTEND_URL}/browsebooks`,
    }),
  };
}

function returnDeclinedTemplate(user, borrow, book) {
  const title = `Return Request Declined`;
  const body = `
    <p>Hi ${user?.name?.split(" ")[0] || "there"},</p>
    <p>Your return request for <b>${book?.title || "a book"}</b> was not approved.</p>
    <p>Status: <b>Active</b>. Please keep the book until further notice or contact the library for details.</p>
  `;
  return {
    subject: `❌ Return Request Declined`,
    html: baseTemplate({
      title,
      body,
      ctaText: "View My Books",
      ctaHref: `${FRONTEND_URL}/mybooks`,
    }),
  };
}

// ---------- Public API ----------
module.exports = {
  // Optionally call this once at server start to fail fast if misconfigured
  verifyEmailTransport: async () => {
    const res = await ensureTransporter();
    if (!res.ok) {
      throw new Error(
        res.reason === "verify-failed"
          ? `Email transport verify failed: ${res.error?.message || "unknown error"}`
          : "Email transport not available: missing credentials"
      );
    }
    return true;
  },

  sendEmail,

  sendRegistrationEmail: async (user) => {
    const tpl = registrationTemplate(user);
    return sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
  },

  sendPaymentSubmittedEmail: async (user, payment) => {
    const tpl = paymentSubmittedTemplate(user, payment);
    return sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
  },

  sendPaymentStatusEmail: async (user, payment) => {
    const tpl = paymentStatusTemplate(user, payment);
    return sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
  },

  sendBorrowConfirmationEmail: async (user, borrow, book) => {
    const tpl = borrowConfirmationTemplate(user, borrow, book);
    return sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
  },

  sendReturnRequestedEmail: async (user, borrow, book) => {
    const tpl = returnRequestedTemplate(user, borrow, book);
    return sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
  },

  sendReturnApprovedEmail: async (user, borrow, book) => {
    const tpl = returnApprovedTemplate(user, borrow, book);
    return sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
  },

  sendReturnDeclinedEmail: async (user, borrow, book) => {
    const tpl = returnDeclinedTemplate(user, borrow, book);
    return sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
  },
};