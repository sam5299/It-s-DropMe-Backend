const Joi = require("joi");
const PasswordComplexity = require("joi-password-complexity");
const mongoose = require("mongoose");

//defining user schema
const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  //fname: { type: String, required: true },
  //lname: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobileNumber: { type: String, unique: true, required: true },
  gender: { type: String, required: true },
  profile: { type: String, required: true },
  password: { type: String, minlength: 6, maxlength: 1024, require: true },
  licenseNumber: { type: String, minlength: 16, maxlength: 16, default: null },
  licenseImage: { type: String, default: null },
  notificationToken: { type: String, default: null },
  sumOfRating: { type: Number, default: 0 },
  totalNumberOfRides: { type: Number, default: 0 },
  totalNumberOfRatedRides: { type: Number, default: 0 },
  // expoToken:{type:String}
});

//object of userSchema export it letter
const User = mongoose.model("User", userSchema);

//Joi validation logic for registration
async function isUserDataValidate(userData) {
  let joiSchema = Joi.object({
    userId: Joi.number().required(),
    // fname: Joi.string().max(20).required(),
    // lname: Joi.string().max(20).required(),
    name: Joi.string().max(50).required(),
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: ["com", "net", "io"] } })
      .required(),
    mobileNumber: Joi.string()
      .length(10)
      .pattern(/[7-9]{1}[0-9]{9}/)
      .required(),

    gender: Joi.string().required(),
    password: new PasswordComplexity({
      min: 8,
      max: 255,
      lowerCase: 1,
      upperCase: 1,
      numeric: 1,
      symbol: 1,
      requirementCount: 4,
    }).required(),
    profile: Joi.string(),
    notificationToken: Joi.string(),
  });
  return joiSchema.validate(userData);
}

module.exports = { User, isUserDataValidate };
