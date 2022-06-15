const { Trip } = require("../models/trip");
const { Ride } = require("../models/ride");
const { addTripRequest, getUserDetailsByRideId } = require("./ride");
const { Vehicle } = require("../models/vehicle");
const { TripRide } = require("../models/trip_ride");
const { loadProfile } = require("./user");
//function to get available trip with id
async function getTrip(tripBody) {
  return await Trip.findOne({
    User: tripBody.User,
    source: tripBody.source,
    destination: tripBody.destination,
    date: tripBody.date,
    time: tripBody.time,
  });
}

//function to add newTrip into Trip collection
async function addNewTrip(tripBody, rid) {
  let NewTrip = new Trip(tripBody);
  let trip = await NewTrip.save();
  trip.requestedRideList.push(rid);
  let result = await trip.save();
  return trip._id;
}

//function to request a ride
async function requestRide(tripBody, rid) {
  let tripId = null;
  //console.log(tripBody);
  let trip = await getTrip(tripBody);
  //console.log("in request ride", trip);
  if (trip) {
    // console.log("previous trip found");
    tripId = trip._id;
    trip.requestedRideList.push(rid);
    trip.status = "Requested";
    let result = await trip.save();
  } else tripId = await addNewTrip(tripBody, rid);
  //console.log("tripId which is to store:"+tripId);
  let requestedTrip = await addTripRequest(tripBody.User, rid, tripId);
  //console.log(requestedTrip);
  return requestedTrip;
}

//function to return details of Trip and User who crated that trip
async function getTripDetails(tripId) {
  return await Trip.findOne({ _id: tripId })
    //.populate('User', '-_id profile fname lname ')
    .populate("User", "_id profile name notificationToken");
  //.select("source destination distance seatRequest ");
}

//function to return requested trip list
async function getUserRequestedTrips(User) {
  let result = await Trip.find({ User: User, status: "Requested" });
  return result;
  //return await Trip.find({ User: User, status: "Requested" }).sort({ _id: -1 });
}

//remove ride id from requestedRideList array of Ride
async function removeRideId(rideId, tripId) {
  // let rideObj = await Ride.findOne({ _id: rideId });
  let tripObj = await Trip.findOne({ _id: tripId });

  //console.log(rideObj.requestedTripList);
  let index = tripObj.requestedRideList.indexOf(rideId);
  tripObj.requestedRideList.splice(index, 1);
  // rideObj.availableSeats += tripObj.seatRequest;
  return tripObj.save();
}

//function to generate 4 digit trip token for each accepted trip request
function generateTripToken() {
  return Math.floor(Math.random() * 1000000);
}

// calculate trip amount
async function calculateTripAmount(vehicleId, distance) {
  let vehicleObj = await Vehicle.findOne({ _id: vehicleId });
  // console.log("Vehicle Object:" + vehicleObj);
  let vehicleClass = vehicleObj.vehicleClass;
  let vehicleType = vehicleObj.vehicleType;
  let classFactor = 1;
  let fuelFactor = 1;
  switch (vehicleClass) {
    case "Electric":
      classFactor = 1.5;
      break;
    case "Normal Bike":
      classFactor = 2;
      break;
    case "Scooter":
      classFactor = 2.5;
      break;
    case "Sport Bike":
      classFactor = 3;
      break;
    case "Hatch Back":
      classFactor = 3.2;
      break;
    case "Sedan":
      classFactor = 3.7;
      break;
    case "SUV":
      classFactor = 5;
      break;
  }
  if ("Car" == vehicleType) {
    // console.log("Car");
    switch (vehicleObj.fuelType) {
      case "Petrol":
        fuelFactor = 2;
        break;
      case "Diesel":
        fuelFactor = 1.8;
        break;
      case "CNG":
        fuelFactor = 1.6;
        break;
      case "Electric":
        fuelFactor = 1.2;
        break;
    }
  }
  let amount = Math.round(fuelFactor * classFactor * distance);
  return amount;
}

module.exports = {
  requestRide,
  getTripDetails,
  generateTripToken,
  calculateTripAmount,
  getUserRequestedTrips,
  removeRideId,
};
