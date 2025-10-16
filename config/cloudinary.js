const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "membership_payments",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const userStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "user_id_pictures",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const bookStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "book_covers",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });
const uploadUserImage = multer({ storage: userStorage });
const uploadBookImage = multer({ storage: bookStorage });

// Direct upload function for user ID pictures
const uploadUserImageDirect = async (fileBuffer, fileName) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "user_id_pictures",
        resource_type: "image",
        allowed_formats: ["jpg", "png", "jpeg"],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(fileBuffer);
  });
};

module.exports = {
  cloudinary,
  upload,
  uploadUserImage,
  uploadUserImageDirect,
  uploadBookImage,
};
