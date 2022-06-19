const mongoose = require("mongoose");
const Joi = require("joi");
const rideSchema = new mongoose.Schema({
  source: { type: String, min: 1, max: 255, required: true },
  s_lat: { type: Number, required: true },
  s_lon: { type: Number, required: true },
  destination: { type: String, min: 1, max: 255, required: true },
  d_lat: { type: Number, required: true },
  d_lon: { type: Number, required: true },
  time: { type: String, required: true },
  date: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  availableSeats: { type: Number, min: 0, max: 8, required: true },
  distance: { type: Number, required: true },
  amount: { type: Number, min: 0, required: true },
  requestedTripList: { type: Array },
  requestedUserList: { type: Array },
  status: {
    type: String,
    enum: ["Created", "Initiated", "Cancelled", "Completed"],
    default: "Created",
    required: true,
  },
  rideType: {
    type: String,
    enum: ["Free", "Paid"],
    required: true,
  },
  rideFor: {
    type: String,
    enum: ["Male", "Female", "Both"],
    required: true,
  },
  User: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  Vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "vehicle",
    required: true,
  },
  rideDate: {
    type: Date,
    required: true,
  },
});

const Ride = mongoose.model("ride", rideSchema);
// status: Joi.string().valid("Created", "Cancelled", "Completed").required(),
function validateRideDetails(rideData) {
  let joiRideSchema = Joi.object({
    source: Joi.string().min(1).max(255).required(),
    s_lat: Joi.number().required(),
    s_lon: Joi.number().required(),
    destination: Joi.string().min(1).max(255).required(),
    d_lat: Joi.number().required(),
    d_lon: Joi.number().required(),
    time: Joi.string().required(),
    date: Joi.string().required(),
    availableSeats: Joi.number().required().min(1).max(8),
    distance: Joi.number().required(),
    amount: Joi.number().required().min(0),
    requestedTripList: Joi.array(),
    requestedUserList: Joi.array(),
    rideFor: Joi.string().valid("Male", "Female", "Both").required(),
    rideType: Joi.string().valid("Free", "Paid").required(),
    vehicleNumber: Joi.string()
      // .regex(/^[A-Z]{2} [0-9]{2,3} [A-Z]{2} [0-9]{1,4}$/)
      .required()
      .messages({
        "object.regex": "Please enter valid vehicle number",
      }),
    User: Joi.string().required(),
    Vehicle: Joi.string().required(),
    rideDate: Joi.date().required(),
  });
  return joiRideSchema.validate(rideData);
}

module.exports = { Ride, validateRideDetails };
