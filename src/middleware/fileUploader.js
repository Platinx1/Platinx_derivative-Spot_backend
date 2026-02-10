const multer = require("multer");
const fs = require("fs");
const AppError = require("../utils/AppError");

const allowedMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/ogg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/vnd.ms-excel", 
];

const fileUploader = (field, folder) => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      if (!fs.existsSync(`public/${folder}`)) {
        fs.mkdirSync(`public/${folder}`, { recursive: true });
      }
      cb(null, `public/${folder}`);
    },
    filename: function (req, file, cb) {
      const { originalname } = file;
      const extI = originalname.lastIndexOf(".");
      const fileExt = extI !== -1 ? originalname.substring(extI).toLowerCase() : ".jpeg";
      const fileName = `${folder}-${Date.now()}${fileExt}`;
      cb(null, fileName);
    },
  });

  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      allowedMimeTypes.includes(file.mimetype)
        ? cb(null, true)
        : cb(new AppError("Invalid file type", 400));
    },
    // Uncomment and adjust if you want to set file size limits
    // limits: {
    //   fileSize: 10 * 1024 * 1024, // 10 MB in bytes
    // },
  }).fields([...field]);

  return upload;
};

module.exports = fileUploader;
