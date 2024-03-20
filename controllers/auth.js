const crypto = require("crypto");
const bcryptjs = require("bcryptjs");

// ********** sendGrid Email ********//
// const nodemailer = require("nodemailer");
// const sendGridTransport = require("nodemailer-sendgrid-transport");
// ********** sendGrid Email ********//

// ********** mailJet Email ********//
const Mailjet = require("node-mailjet");
const mailjet = Mailjet.apiConnect(
  "8f1bd51891e67c5f9cd91fcdd1b1d620",
  "3c59f0b0523c680ee3524003f14f0d67"
);
// ********** mailJet Email ********//

const User = require("../models/user");
const user = require("../models/user");

// ********** sendGrid Email ********//
// const transporter = nodemailer.createTransport(
//   sendGridTransport({
//     auth: {
//       api_key: "",
//     },
//   })
// );
// ********** sendGrid Email ********//

const { validationResult } = require("express-validator/check");

exports.getLogin = (req, res, next) => {
  //   const isLoggedIn = req.get("Cookie").split(';')[1].trim().split('=')[1] === 'true';

  console.log(req.flash("error")[0]);
  // let message = req.flash("error"); // **** IT HAS BUG🐛 *****//
  // if (message.length > 0) {
  //   console.log(message)
  //   message = message[0];
  // } else {
  //   message = null;
  // }

  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: req.flash("error"),
    // errorMessage: Message
    // isAuthenticated: false,
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
  });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: req.flash("error"),
    // isAuthenticated: false,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  // res.setHeader("Set-Cookie", "loggedIn=true; HttpOnly");
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      //errorMessage: req.flash("error"),
      errorMessage: errors.array()[0].msg,
      // isAuthenticated: false,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    });
  }

  User.findOne({ email: email }).then((user) => {
    if (!user) {
      // req.flash("error", "Invalid email or password");
      // return res.redirect("/login");
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        // errorMessage: errors.array()[0].msg,
        errorMessage: "Invalid email or password",
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: [],
      });
    }
    bcryptjs
      .compare(password, user.password)
      .then((doMatch) => {
        if (doMatch) {
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save((err) => {
            console.log(err);
            res.redirect("/");
          });
        }
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          // errorMessage: errors.array()[0].msg,
          errorMessage: "Invalid email or password",
          oldInput: {
            email: email,
            password: password,
          },
          validationErrors: [],
        });
      })
      .catch((err) => {
        // console.log(err);
        // res.redirect("/login");
        //****** middle ware solution ******/
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
        //****** middle ware solution ******/
      });
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      //errorMessage: req.flash("error"),
      errorMessage: errors.array()[0].msg,
      // isAuthenticated: false,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  bcryptjs
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        card: {
          items: [],
        },
      });
      return user.save();
    })
    .then((result) => {
      // return transporter.sendMail({
      //   to: email,
      //   from: "bla",
      //   subject: "Signup succeeded!",
      //   html: "<h1>You successfully signed up!</h1>",
      // });

      return mailjet.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: {
              Email: "arin.movsesian@gmail.com",
              Name: "Arin",
            },
            To: [
              {
                Email: email,
                Name: email,
              },
            ],
            Subject: "Signup succeeded!",
            HTMLPart: "<h1>You successfully signed up!</h1>",
          },
        ],
      });
    })
    .then((result) => {
      console.log("EMAIL", result.body);
      res.redirect("/login");
    })
    .catch((err) => {
       //****** middle ware solution ******/
       const error = new Error(err);
       error.httpStatusCode = 500;
       return next(error);
       //****** middle ware solution ******/
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  // let message = req.flash("error"); // **** IT HAS BUG🐛 *****//
  // if (message.length > 0) {
  //   console.log(message)
  //   message = message[0];
  // } else {
  //   message = null;
  // }

  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: req.flash("error"),
    // errorMessage: message
    // isAuthenticated: false,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email found");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        // transporter.sendMail({
        //   to: req.body.email,
        //   from: "bla",
        //   subject: "Password reset",
        //   html: `
        //       <p>You requested a password reset</p>
        //       <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password</p>
        //     `,
        // });
        return mailjet.post("send", { version: "v3.1" }).request({
          Messages: [
            {
              From: {
                Email: "arin.movsesian@gmail.com",
                Name: "Arin",
              },
              To: [
                {
                  Email: req.body.email,
                  Name: req.body.email,
                },
              ],
              Subject: "Signup succeeded!",
              HTMLPart: `
              <p>You requested a password reset</p>
              <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password</p>
              `,
            },
          ],
        });
      })
      .then((result) => {
        console.log("EMAIL", result.body);
        res.redirect("/");
      })
      .catch((err) => {
        //****** middle ware solution ******/
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
        //****** middle ware solution ******/
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  console.log(token);
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      // let message = req.flash("error"); // **** IT HAS BUG🐛 *****//
      // if (message.length > 0) {
      //   console.log(message)
      //   message = message[0];
      // } else {
      //   message = null;
      // }

      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: req.flash("error"),
        userId: user._id.toString(),
        passwordToken: token,
        // errorMessage: message
        // isAuthenticated: false,
      });
    })
    .catch((err) => {
       //****** middle ware solution ******/
       const error = new Error(err);
       error.httpStatusCode = 500;
       return next(error);
       //****** middle ware solution ******/
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcryptjs.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
       //****** middle ware solution ******/
       const error = new Error(err);
       error.httpStatusCode = 500;
       return next(error);
       //****** middle ware solution ******/
    });
};
