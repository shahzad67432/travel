import nodemailer from "nodemailer"
export const transporter = nodemailer.createTransport({
    host: "smtp.mandrillapp.com",
    port: 587,
    auth: {
      user: process.env.MAILCHIMP_USERNAME,
      pass: process.env.MAILCHIMP_API_KEY
    }
  })