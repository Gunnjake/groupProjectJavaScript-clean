// Email transporter module - exports transporter only, no code runs on import
// Uses Ethereal test account credentials

const nodemailer = require("nodemailer");

// Ethereal test account credentials - DO NOT CHANGE
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: "melyssa.kessler64@ethereal.email",
    pass: "xHvH6nmX8u4JWpZmyk"
  }
});

module.exports = transporter;

