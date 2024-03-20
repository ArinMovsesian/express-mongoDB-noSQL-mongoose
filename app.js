const path = require("path");
const fs = require("fs");
const https = require("https");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session); //Immediately Invoked Function Expression
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const errorController = require("./controllers/error");
const User = require("./models/user");

console.log('process.env.NODE_ENV', process.env.NODE_ENV);

const MONGODB_URI =
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.hdxx9ow.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?&w=majority`
  // "mongodb://localhost:27017/max"
  // `mongodb://localhost:90/${process.env.MONGO_DEFAULT_DATABASE}`

const app = express();

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});

const csrfProtection = csrf();

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images')
  },
  filename: (req, file, cb) => {
    const d = (Math.random() + 1).toString(36).substring(7);
    cb(null, d + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png') {
    cb(null, true)
  } else {
    cb(null, false)
  }
};

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const { Certificate } = require("crypto");

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})

app.use(helmet()); // Helmet helps secure Express apps by setting HTTP response headers.
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream })); // HTTP request logger middleware for node.js

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, "images")));

app.use(
  session({
    secret: "my secret", //This is the secret used to sign the session ID cookie.
    resave: false,
    saveUninitialized: false,
    store: store,
    name: 'arinTest' //The name of the session ID cookie. the default value is 'connect.sid'.
  })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn; //available for the views
  res.locals.csrfToken = req.csrfToken(); //available for the views
  next();
});

app.use((req, res, next) => {
  // console.log('session', req.session);
  // console.log('locals', req.locals);
  // console.log('csrfToken', req.csrfToken());
  //**** Sync ****/
  // throw new Error('Sync Dummy');
  //**** Sync ****/
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      //**** Async ****/
      // throw new Error('Dummy')
      //**** Async ****/
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      // throw new Error(err);
      //**** Async ****/
      next(new Error(err))
      //**** Async ****/
    });
});



app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...)
  // res.redirect('/500')
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
})

mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    console.log("connected!");
    app.listen(process.env.PORT || 3000);
    // https
    //   .createServer({key: privateKey, cert: certificate}, app)
    //   .listen(process.env.PORT || 3000);
  })
  .catch((err) => console.log("connecting problem!", err));
