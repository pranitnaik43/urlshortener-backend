const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_FROM_PASSWORD
  }
});
// console.log(password);

let mailOptionsTemplate = {
  from: process.env.EMAIL_FROM,
  to: '',
  subject: '',
  html: ''
};

const service = {
  sendMail(email_to, subject, htmlBody, resetLink) {
    mailOptions = {...mailOptionsTemplate};
    mailOptions.to = email_to;
    mailOptions.subject = subject;
    mailOptions.html = htmlBody;
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log(Date.now()+' Email sent: ' + info.response);
      }
    });
  }
}

module.exports = service;