const express = require("express");

const coinswitchRoutes = require("./coinswitchRoutes");


exports.appRoutes = (app) => {
  app.use("/public", express.static("public"));

  //coinswitch routes
  app.use("/api/coinswitch", coinswitchRoutes);
};
