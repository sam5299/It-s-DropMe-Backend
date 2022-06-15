const mongoose = require("mongoose");
const Joi = require("joi");
const { array } = require("joi");

let tripSchema = new mongoose.Schema({
  source: { type: String, required: true },
  destination: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  distance: { type: Number, required: true },
  pickupPoint: { type: String, required: true },
  seatRequest: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Booked", "Requested", "Cancelled", "Completed", "Rejected"],
    default: "Requested",
  },
  requestedRideList: { type: Array },
  User: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

let Trip = mongoose.model("trip", tripSchema);

// function for creating new trip
function validateTrip(body) {
  let joiTripValidationSchema = Joi.object({
    source: Joi.string().required(),
    destination: Joi.string().required(),
    date: Joi.string().required(),
    time: Joi.string().required(),
    pickupPoint: Joi.string().required(),
    distance: Joi.number().required(),
    seatRequest: Joi.number().required(),
    amount: Joi.number().required(),
    User: Joi.string().required(),
  });
  return joiTripValidationSchema.validate(body);
}

module.exports = { Trip, validateTrip };
