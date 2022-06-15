const mongoose = require('mongoose');
const Joi = require('joi');


let tripRideSchema = new mongoose.Schema({
    status: {type:String, required:true, default:"Booked"},
    vehicleNumber: {type:String, required:true},
    token: {type:Number, default:0},
    routeMatch: {type:Number, default:100},
    tripRating: {type:Number, default:null},
    amount: {type:Number, required:true},
    tripId: {type:mongoose.Schema.Types.ObjectId,ref:"Trip", required:true},
    rideId: {type:mongoose.Schema.Types.ObjectId,ref:"Ride", required:true},
    startTime: { type: String, default:null },
    endTime: { type: String, default:null },
    date: { type: String, required: true },
    RaiderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },   
      PassengerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
});

let TripRide = mongoose.model("trip_ride",tripRideSchema);

function validateTripRide(body) {
    const joiTripRideValidateSchema = Joi.object({
        status: Joi.string().valid("Booked","Initiated","Completed","Cancelled", "Rejected"),
        vehicleNumber: Joi.string().required(),
        tripId: Joi.string().required(),
        rideId: Joi.string().required(),
        amount: Joi.number().required(),
        token: Joi.number().required(),
        RaiderId: Joi.string().required(),
        PassengerId: Joi.string().required(),
        date: Joi.string().required(),



    });
    return joiTripRideValidateSchema.validate(body);
}

module.exports = {TripRide, validateTripRide}