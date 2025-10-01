import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

// property
const template_html = path.join(__dirname, "../assets/template.html");

export async function sendMail(errorContext: string) {
  // check env variables
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!user || !pass) {
    console.log(`[--ERROR--] There are no valid environment variables...`);
  } else {
    // make transport
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: user,
        pass: pass,
      },
    });

    // generate html content
    const baseHtml = fs.readFileSync(template_html, "utf-8");
    const $ = cheerio.load(baseHtml);
    $("#error-message").text(errorContext);
    const htmlContent = $.html();

    const result = await transport.sendMail({
      html: htmlContent,
      to: user,
      subject: "[Daily task] Workflow error notify_",
    });
    return result;
  }
}
