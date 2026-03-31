const express = require("express");

const coinswitchRoutes = require("./coinswitchRoutes");
const pi42Routes = require("./pi42Routes");


exports.appRoutes = (app) => {
  app.use("/public", express.static("public"));

  //coinswitch routes
  app.use("/api/coinswitch", coinswitchRoutes);
  app.use("/api/pi42", pi42Routes);
};
