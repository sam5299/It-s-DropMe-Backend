const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");
const genPassword = require("generate-password");

//multer with whole configuration for saving images into image_files folder.
const { User } = require("../models/user");
const { uploadFileNew } = require("../middleware/upload_file");
const fileUpload = require("express-fileupload");
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(fileUpload({ useTempFiles: true, tempFileDir: "../image_files" }));

//password hashing function
async function encryptPassword(password) {
  let salt = await bcrypt.genSalt(10);
  let hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

//get unique id for newly registering user.
async function getUniqueId() {
  try {
    let lastUserId = await User.findOne()
      .select("_id userId")
      .sort({ userId: -1 })
      .limit(1);

    if (!lastUserId) {
      return 1;
    }
    //console.log("temp result:" + typeof lastUserId.userId);
    return lastUserId.userId + 1;
  } catch (ex) {
    console.log("exception occured:" + ex);
    return ex;
  }
}

//check if user already present with same input fields
async function isUserExists(mobileNo) {
  try {
    return await User.findOne({ mobileNumber: mobileNo });
  } catch (ex) {
    return ex;
  }
}

//function to get all Users
async function getUser(id) {
  //console.log("called getUser");
  try {
    let user = await User.findOne({ _id: id }, { userId: 0, __v: 0 });
    if (!user) return "Users not found";
    else return user;
  } catch (ex) {
    return ex;
  }
}

//addUser updated function
async function addUserUpdated(req) {
  req.body.password = await encryptPassword(req.body.password);
  const newUser = new User(req.body);
  return await newUser.save();
}

//method for validating input while login
async function validateLogin(loginData) {
  let schema = Joi.object({
    mobileNumber: Joi.string()
      .length(10)
      .pattern(/[7-9]{1}[0-9]{9}/)
      .required(),
    password: Joi.string().required(),
    notificationToken: Joi.string(),
  });
  return await schema.validate(loginData);
}

//function to check whether license detail's already present or not
async function isLicenseDetailsPresent(userId) {
  let licenseDetails = await User.findOne(
    { userId: userId },
    { licenseNumber: 1, licensePhoto: 1, _id: 0 }
  );
  // console.log(licenseDetails);
  if (
    licenseDetails.licenseNumber === null ||
    licenseDetails.licensePhoto === null
  ) {
    return false;
  }
  return true;
}

//Joi validation for license Number
async function validateLicenseNumber(licenseNumber) {
  let joiDrivingLicenseSchema = Joi.object({
    licenseNumber: Joi.string().pattern(
      /^(([A-Z]{2}[0-9]{2})( )|([A-Z]{2}-[0-9]{2}))((19|20)[0-9][0-9])[0-9]{7}$/
    ),
  });
  return await joiDrivingLicenseSchema.validate(licenseNumber);
}

//function to check if licenseNumber in body already exists
async function isLicenseNumberExists(licenseNum) {
  return await User.findOne({ licenseNumber: licenseNum });
}

//function to update user's licenseNumber and licenseDocument image path
async function updateUserLicenseDetails(userId, licenseNumber, licenseImage) {
  //console.log("uploading license image:" + licenseImage);
  let user = await User.findOne({ userId: userId });
  // console.log("User found:", user);
  user.licenseNumber = licenseNumber;
  user.licenseImage = licenseImage;
  return user.save();
}

//authenticate user for login
async function loginPasswordAuthentication(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

//get random generated password for forgot password
async function generateRandomPassword() {
  var password = genPassword.generate({
    length: 8,
    numbers: true,
    uppercase: true,
    lowercase: true,
    symbols: true,
    exclude: `^$&()~"!-'<>{}[]=`,
    strict: true,
  });
  return password;
}

//function to check password complexity
function validatePassword(password) {
  let joiSchema = Joi.object({
    password: new passwordComplexity({
      min: 8,
      max: 255,
      lowerCase: 1,
      upperCase: 1,
      numeric: 1,
      symbol: 1,
      requirementCount: 4,
    }),
  });
  return joiSchema.validate(password);
}

// p to send mail of password reset
async function mailSend(mailId, password) {
  let message =
    "User your new password for DropMe is " +
    password +
    "\n\n\n\nPlease update your password after login";

  let result = await nodemailerService(mailId, message);
  if (result) {
    console.log("Password set!");
    return true;
  } else return false;
}

//method to call nodemailer and send mail
function nodemailerService(mail, message) {
  return new Promise((resolve, reject) => {
    let nodemailer = require("nodemailer");
    let transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      auth: {
        user: "dropmeagos@gmail.com",
        pass: "Dropme@agos4",
      },
    });

    let mailOptions = {
      from: "dropmeagos@gmail.com",
      to: mail,
      subject: "DropMe user forgot password",
      text: message,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error while sending mail " + error);
        resolve(false);
      } else {
        console.log("Email sent");
        resolve(true);
      }
    });
  });
}

// function to get profile details
async function loadProfile(userId) {
  return await User.findOne(
    { _id: userId },
    {
      name: 1,
      email: 1,
      mobileNumber: 1,
      profile: 1,
      totalNumberOfRides: 1,
      sumOfRating: 1,
      totalNumberOfRatedRides: 1,
    }
  );
}

module.exports = {
  getUniqueId,
  isUserExists,
  getUser,
  addUserUpdated,
  validateLogin,
  loginPasswordAuthentication,
  validateLicenseNumber,
  updateUserLicenseDetails,
  isLicenseDetailsPresent,
  isLicenseNumberExists,
  generateRandomPassword,
  mailSend,
  encryptPassword,
  validatePassword,
  loadProfile,
};
