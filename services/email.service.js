import sgMail from "@sendgrid/mail";
import ejs from "ejs";
import fs from "fs";
import path from "path";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const __root = process.cwd();
const VIEW_ROOT = path.join(__root, "views");
const LAYOUT_PATH = path.join(VIEW_ROOT, "index.ejs");

function renderTemplate(bodyPartialName, data) {
  const layoutStr = fs.readFileSync(LAYOUT_PATH, "utf8");
  return ejs.render(layoutStr, { body: bodyPartialName, ...data }, { root: VIEW_ROOT });
}

class EmailService {
  async sendCourseEnrollment(to, dynamicData = {}) {
    try {
      const html = renderTemplate("course-enrolled", {
        companyName: "Miraspark Academy",
        userName: dynamicData.userName || "Learner",
        courseTitle: dynamicData.courseTitle || "Prompt Engineering Course",
        courseStart: dynamicData.courseStart || "TBA",
        courseSchedule: dynamicData.courseSchedule || "TBA",
        whatsappLink: dynamicData.whatsappLink || "#",
        zoomLink: dynamicData.zoomLink || "#",
        zoomPasscode: dynamicData.zoomPasscode || "",
        supportEmail: dynamicData.supportEmail || "support@miraspark.academy",
        supportPhone: dynamicData.supportPhone || "+91-00000 00000",
        year: new Date().getFullYear(),
      });

      const msg = {
        to,
        from: process.env.SENDGRID_SENDER, // e.g. "no-reply@miraspark.academy"
        subject: "🎉 You’re Enrolled! Prompt Engineering Course @ Miraspark Academy",
        text: `Hi ${dynamicData.userName}, your enrollment for ${dynamicData.courseTitle} is confirmed. Join WhatsApp: ${dynamicData.whatsappLink}, Zoom: ${dynamicData.zoomLink}. For help, email ${dynamicData.supportEmail}.`,
        html,
      };

      const [res] = await sgMail.send(msg);
      return res?.statusCode >= 200 && res?.statusCode < 300;
    } catch (err) {
      console.error("[email.service] sendCourseEnrollment error:", err);
      return false;
    }
  }
}

export default new EmailService();
