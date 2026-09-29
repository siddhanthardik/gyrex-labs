/**
 * Gyrex Labs - Transactional Email Service
 *
 * Implements standard email templates.
 * Enforces rule:
 * Email service failure must NEVER break a successful order or transaction.
 * Sensitive reports are NEVER attached directly in plain email.
 */

import {
  EmailProvider,
  SendEmailParams,
  EmailSendResult,
  EmailTemplateId,
} from "@/lib/integrations/types";

export class EmailService implements EmailProvider {
  private readonly apiKey: string | null;
  private readonly fromAddress: string;

  constructor() {
    this.apiKey = process.env.EMAIL_API_KEY || null;
    this.fromAddress = process.env.EMAIL_FROM || "notifications@labs.gyrex.in";
  }

  /**
   * Renders the HTML content for an email template safely without sensitive data leakage.
   */
  renderTemplate(templateId: EmailTemplateId, data: Record<string, unknown>): { subject: string; html: string } {
    switch (templateId) {
      case "PATIENT_ORDER_CONFIRMATION":
        return {
          subject: `Order Confirmed: ${data.orderNumber} - ${data.labName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
              <h2>Your Diagnostic Booking is Confirmed</h2>
              <p>Dear ${data.patientName},</p>
              <p>Your booking with <strong>${data.labName}</strong> has been received and confirmed.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Order Number:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.orderNumber}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Collection Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.collectionType}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Amount:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">₹${data.totalAmount}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Payment Method:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.paymentMethod}</td></tr>
              </table>
              <p style="color: #666; font-size: 13px;">Powered by Gyrex Labs. Your payment and clinical services are provided directly by ${data.labName}.</p>
            </div>
          `,
        };

      case "PATIENT_REPORT_READY":
        // Medical Privacy: Never attach clinical reports directly to unencrypted email
        return {
          subject: `Diagnostic Report Ready: Order ${data.orderNumber}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
              <h2>Your Report is Ready</h2>
              <p>Dear ${data.patientName},</p>
              <p>Your diagnostic test report from <strong>${data.labName}</strong> has been released and is now ready for secure viewing.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">To protect your medical privacy:</p>
                <p style="margin: 5px 0 0; font-size: 14px; color: #475569;">
                  Reports are not sent via email. Please sign in to your secure patient portal using your registered phone number to download your official PDF report.
                </p>
              </div>
              <p><a href="${data.portalUrl}" style="background: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Access Secure Patient Portal</a></p>
            </div>
          `,
        };

      case "LAB_NEW_ORDER_ALERT":
        return {
          subject: `New Patient Order: ${data.orderNumber}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h3>New Diagnostic Booking Received</h3>
              <p>Order <strong>${data.orderNumber}</strong> has been placed for <strong>${data.patientName}</strong> (${data.collectionType}).</p>
              <p>Please log in to your Lab Admin portal to manage this order.</p>
            </div>
          `,
        };

      case "LAB_SUBSCRIPTION_INVOICE":
        return {
          subject: `Gyrex SaaS Invoice: ${data.invoiceNumber}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h3>Gyrex Platform Subscription Invoice</h3>
              <p>Invoice <strong>${data.invoiceNumber}</strong> for plan <strong>${data.planName}</strong> is now available.</p>
              <p>Amount Due: ₹${data.amountDue}</p>
            </div>
          `,
        };

      case "LAB_EMAIL_VERIFICATION":
        return {
          subject: "Verify your email address - Gyrex Labs",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; color: #1e293b;">
              <div style="margin-bottom: 24px;">
                <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.025em; color: #0284c7;">GYREX LABS</span>
              </div>
              <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Verify your email address</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                Hello ${data.ownerName || "there"},<br/>
                Thank you for creating an account for <strong>${data.labName || "your laboratory"}</strong> on Gyrex Labs. To complete your registration and activate your laboratory workspace, please verify your email address.
              </p>
              <div style="margin: 32px 0;">
                <a href="${data.verificationUrl}" style="background-color: #0284c7; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">
                This link will expire in 24 hours. If you did not create an account on Gyrex Labs, please disregard this email.
              </p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
                If you are having trouble clicking the button above, copy and paste this URL into your browser:<br/>
                <a href="${data.verificationUrl}" style="color: #0284c7; word-break: break-all;">${data.verificationUrl}</a>
              </p>
            </div>
          `,
        };

      default:
        return {
          subject: String(data.subject || "Gyrex Labs Notification"),
          html: `<p>${String(data.message || "Notification from Gyrex Labs.")}</p>`,
        };
    }
  }

  /**
   * Sends transactional email.
   * Catches all errors gracefully to avoid aborting primary business transactions.
   */
  async send(params: SendEmailParams): Promise<EmailSendResult> {
    const { subject, html } = this.renderTemplate(params.templateId, params.templateData);

    if (!this.apiKey) {
      // Offline / dev mock mode: log safely
      return {
        messageId: `msg_mock_${Date.now()}`,
        success: true,
        timestamp: new Date(),
      };
    }

    try {
      // Integration call to transactional provider (e.g. Resend / SendGrid / Postmark)
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [params.to],
          subject: params.subject || subject,
          html,
          reply_to: params.replyTo,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error("Email delivery failed:", errJson);
        return {
          messageId: `failed_${Date.now()}`,
          success: false,
          timestamp: new Date(),
          error: errJson.message || "Email provider rejected request",
        };
      }

      const json = await res.json();
      return {
        messageId: json.id || `msg_${Date.now()}`,
        success: true,
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      console.error("Email service network failure (non-blocking):", err);
      return {
        messageId: `failed_net_${Date.now()}`,
        success: false,
        timestamp: new Date(),
        error: "Network failure while dispatching email",
      };
    }
  }
}

export const emailService = new EmailService();
