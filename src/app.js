const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
// const cron = require("node-cron");

const { appRoutes } = require("./routes/appRoutes");
const AppError = require("./utils/AppError");
const globalErrorHandler = require("./controllers/errorController");

const app = express();

//body parser middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

//cors middleware
app.use(cors());
app.use(morgan("dev"));

//cookie parser middleware
app.use(cookieParser());

// testing middleware
app.use("/", async (req, res, next) => {
  // console.log(req.body);
  next();
});

//routes
appRoutes(app);

// unhandle route middleware
// app.all("*", (req, res, next) => {
//   return next(
//     new AppError(`The route ${req.originalUrl} not run on this server.`, 404)
//   );
// });

// global error middleware
app.use(globalErrorHandler);

module.exports = app;
