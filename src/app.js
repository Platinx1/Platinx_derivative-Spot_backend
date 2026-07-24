// const express = require("express");
// const cookieParser = require("cookie-parser");
// const cors = require("cors");
// const morgan = require("morgan");
// // const cron = require("node-cron");

// const { appRoutes } = require("./routes/appRoutes");
// const AppError = require("./utils/AppError");
// const globalErrorHandler = require("./controllers/errorController");

// const app = express();

// //body parser middleware
// app.use(express.json({ limit: "50mb" }));
// app.use(express.urlencoded({ limit: "50mb", extended: true }));

// //cors middleware
// // ====================== CORS - SABSE PEHLE ======================
// const allowedOrigins = [
//   "https://teknikoglobal.com",
//   "https://www.teknikoglobal.com",
//   "http://teknikoglobal.com",
//   "http://www.teknikoglobal.com",
//   "http://localhost:3000",
//   "http://localhost:5173",
//   "http://160.187.87.138:860",
//   "http://127.0.0.1:3000",
//   "https://trade.platinx.exchange"
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         console.log("❌ Blocked by CORS: ", origin);
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
//     exposedHeaders: ["Content-Length", "X-Request-ID"],
//   })
// );

// // Preflight requests ke liye
// app.options("*", cors());
// app.use(morgan("dev"));

// //cookie parser middleware
// app.use(cookieParser());

// // testing middleware
// // app.use("/", async (req, res, next) => {
// //   // console.log(req.body);
// //   next();
// // });

// //routes
// appRoutes(app);

// // unhandle route middleware
// app.use((req, res, next) => {
//   next(new AppError(`The route ${req.originalUrl} not found on this server`, 404));
// });

// // global error middleware
// app.use(globalErrorHandler);

// module.exports = app;



const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");

const { appRoutes } = require("./routes/appRoutes");
const AppError = require("./utils/AppError");
const globalErrorHandler = require("./controllers/errorController");

const app = express();

// ====================== BODY PARSER ======================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ====================== CORS ======================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://160.187.87.138:860",
  "http://127.0.0.1:3000",
  "https://platinx.exchange",
  "https://trade.platinx.exchange",
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without Origin (Postman, curl, mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],

  exposedHeaders: ["Content-Length", "X-Request-ID"],
};

app.use(cors(corsOptions));

// ====================== LOGGER ======================
app.use(morgan("dev"));

// ====================== COOKIE PARSER ======================
app.use(cookieParser());

// ====================== ROUTES ======================
appRoutes(app);

// ====================== 404 ======================
app.use((req, res, next) => {
  next(new AppError(`The route ${req.originalUrl} not found on this server`, 404));
});

// ====================== GLOBAL ERROR HANDLER ======================
app.use(globalErrorHandler);

module.exports = app;
