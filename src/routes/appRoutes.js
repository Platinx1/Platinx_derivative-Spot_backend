const express = require("express");

const coinswitchRoutes = require("./coinswitchRoutes");
const pi42Routes = require("./pi42Routes");


exports.appRoutes = (app) => {
  app.use("/public", express.static("public"));
  app.use("/api/spot", coinswitchRoutes);
  app.use("/api/fno", pi42Routes);
};
