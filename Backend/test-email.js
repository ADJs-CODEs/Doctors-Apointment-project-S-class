import nodemailer from 'nodemailer';
import 'dotenv/config';

async function runTest() {
  console.log("--- STARTING SMTP DIAGNOSTIC ---");
  console.log("Connecting to:", process.env.SMTP_HOST);
  console.log("Using User:", process.env.SMTP_USER);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // This forces the logs to show in your terminal
    debug: true,
    logger: true 
  });

  try {
    // 1. First, verify the connection actually works
    console.log("Step 1: Verifying Connection...");
    await transporter.verify();
    console.log("✅ Connection verified!");

    // 2. Try to send the mail
    console.log("Step 2: Sending Test Email...");
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER, 
      subject: "Diagnostic Test",
      text: "If you see this, your backend is configured correctly."
    });

    console.log("✅ MAIL SENT!");
    console.log("Response:", info.response);

  } catch (error) {
    console.log("❌ DIAGNOSTIC FAILED");
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
    
    if (error.code === 'EAUTH') {
      console.log("TIP: This is an Authentication error. Check your App Password.");
    } else if (error.code === 'ESOCKET') {
      console.log("TIP: This is a Network/Socket error. Try changing Port 587 to 465 or check your ISP.");
    }
  } finally {
    process.exit();
  }
}

runTest();