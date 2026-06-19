const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const pi42Pair = require("../../../models/pi42Models/pi42Pairs");


exports.getPairByName = catchAsync(async (req, res, next) => {
  const { name } = req.query;

  // 🔥 validation
  if (!name) {
    return next(new AppError("name is required", 400));
  }

  const pair = await pi42Pair.findOne({ name: name.trim().toUpperCase() });

  if (!pair) {
    return next(new AppError("Pair not found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Pair fetched successfully",
    data: pair,
  });
});