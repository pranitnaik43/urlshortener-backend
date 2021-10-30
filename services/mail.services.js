const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_FROM_PASSWORD
  }
});
// console.log(password);

let mailOptions = {
  from: process.env.EMAIL_FROM,
  to: '',
  subject: '',
  html: ''
};

let resetMailBody = "<p>Hi</p><p>Following is the link to reset your password</p>"

const service = {
  sendMail(email_to, subject, resetLink) {
    mailOptions.to = email_to;
    mailOptions.subject = subject;
    mailOptions.html = resetMailBody + "<a href="+resetLink+">Reset Password</a></br>";
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