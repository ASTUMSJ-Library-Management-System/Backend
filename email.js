const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "linatemam0707@gmail.com",
    pass: "nnkd cyir sghy bpsm",
  },
});

const sendMailTo = (params) => {
  const sendoptions = {
    from: "linatemam0707@gmail.com",
    to: params,
    subject: "📚 Welcome to the Library System!",
    text: `Hello,

✅ You have successfully registered to our Library System.

We are excited to have you as a member! 🎉  
With your new account, you can:
- Browse and borrow books  
- Access digital resources  
- Stay updated on new arrivals  

Thank you for joining, and happy reading! 📖  

Best regards,  
Library Management Team
    `,
  };

  transporter.sendMail(sendoptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

module.exports = sendMailTo;
