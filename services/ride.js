const express = require("express");
const { Ride } = require("../models/ride");
const { User } = require("../models/user");
const fs = require("fs");
const req = require("express/lib/request");
const { Vehicle } = require("../models/vehicle");
const { trip_ride, TripRide } = require("../models/trip_ride");
const { Trip } = require("../models/trip");

// create ride function
async function createRide(rideDetails) {
  //console.log("Saving");
  const newRide = new Ride(rideDetails);
  return await newRide.save();
}

// function to get ride details by its rid
async function getRideDetails(rid, user) {
  return await Ride.findOne({ _id: rid, User: user, status: "Created" });
}

// get ride by source destination date and  time
async function getCreatedRides(
  userId,
  Source,
  Destination,
  date,
  Time,
  seats,
  gender
) {
  //   TripRide.find({rideId:rid, status:status}).populate("tripId","-_id User",Trip);
  // }

  // console.log("User id:" + userId);
  // console.log("Source:" + Source);
  // console.log("Destination:" + Destination);
  // console.log("Date:" + Date);
  // console.log("Seats:" + seats);
  // console.log("Gender:" + gender);

  // let dateObj=convertToDate(date);

  return await Ride.find({
    source: Source,
    destination: Destination,
    // time: Time,
    date: date,
    availableSeats: { $gte: seats },
    User: { $ne: userId },
    requestedUserList: { $nin: userId },
    status: "Created",
  })
    .populate(
      "User",
      "_id profile name sumOfRating totalNumberOfRatedRides notificationToken",
      User
    )
    .populate(
      "Vehicle",
      "_id vehicleNumber vehicleName vehicleImage vehicleClass vehicleType",
      Vehicle
    )
    .find({ $or: [{ rideFor: gender }, { rideFor: "Both" }] });
  // .find({ $not: [{ User: userId }] });
}
// Add trip request
async function addTripRequest(passengerId, rideId, tripId) {
  let [rideObj] = await Ride.find({ _id: rideId });
  if (!rideObj) return null;
  rideObj.requestedTripList.push(tripId);
  rideObj.requestedUserList.push(passengerId);
  return await rideObj.save();
}

// get ride by user id
async function getUserRides(userId) {
  return await Ride.find({
    User: userId,
    status: "Created",
    availableSeats: { $gt: 0 },
  })
    .populate("Vehicle", "_id  vehicleImage ", Vehicle)
    .populate("User", "_id name", User)
    .sort({ _id: -1 });
  //.where({rideDate:{$gte:Date.now}});
  //.find({$gte:[{rideDate:Date.now}]});
}

// update the status of the ride
async function updateRideStatus(rideId, status) {
  console.log("Update ride status is called");
  let rideObj = await Ride.findOne({ _id: rideId });
  rideObj.status = status;
  return await rideObj.save();
}

// delete a ride by its id
async function deleteRide(rideId) {
  return await Ride.findOneAndDelete({
    _id: rideId,
  });
}

// to get list of all trip who has requested for particular ride
async function getTripRequestList(rid) {
  return await Ride.findOne({ _id: rid }, { _id: 1, requestedTripList: 1 });
}

// reduce availableSeat of ride after successfully accepting ride
async function reduceAvailableSeats(rid, seatCount) {
  console.log("Ride id", rid);
  let ride = await Ride.findOne({ _id: rid });
  ride.availableSeats = ride.availableSeats - seatCount;
  // console.log("Update seats function", ride.availableSeats);
  return await ride.save();
}

//remove trip id from requestList array of Ride
async function removeTripId(rideId, tripId) {
  let rideObj = await Ride.findOne({ _id: rideId });
  let tripObj = await Trip.findOne({ _id: tripId });

  //console.log(rideObj.requestedTripList);
  let index = rideObj.requestedTripList.indexOf(tripId);
  rideObj.requestedTripList.splice(index, 1);
  rideObj.requestedUserList.splice(index, 1);
  // rideObj.availableSeats += tripObj.seatRequest;
  return rideObj.save();
}

//function to return time difference between ride time and current time
function getTimeDifference(rideDate) {
  let d1 = new Date(Date.parse(rideDate));
  let d2 = new Date(Date.parse(Date())); //"Mon May 02 2022;06:30");
  let hrs = Math.round((d1 - d2) / (1000 * 60 * 60));
  // console.log(hrs);
  // console.log(d1.toString());
  // console.log(d2.toString());
  return hrs;
}

async function checkIsBooked(rideId) {
  return await TripRide.find({ rideId: rideId, status: "Booked" });
}

//function to get User's detail's from rid
async function getUserDetailsByRideId(rid) {
  // path: 'key_with_ref',
  // model: 'model_name',
  // select: { 'field_name': 1,'field_name':1},
  // console.log("ride id:", rid);
  return await Ride.findOne({ _id: rid }, { _id: 0, User: 1 }).populate({
    path: "User",
    model: User,
    select: { _id: 1, name: 1 },
  });
}

//function which return date object of date string
function convertToDate(dateString) {
  let splitResult = dateString.split(" ");
  // console.log(splitResult);
  let Day = parseInt(splitResult[2]);
  let Year = parseInt(splitResult[3]);
  let Month;
  switch (splitResult[1]) {
    case "Jan":
      Month = 1;
      break;
    case "Feb":
      Month = 2;
      break;
    case "Mar":
      Month = 3;
      break;
    case "Apr":
      Month = 4;
      break;
    case "May":
      Month = 5;
      break;
    case "Jun":
      Month = 6;
      break;
    case "Jul":
      Month = 7;
      break;
    case "Aug":
      Month = 8;
      break;
    case "Sep":
      Month = 9;
      break;
    case "Oct":
      Month = 10;
      break;
    case "Nov":
      Month = 11;
      break;
    case "Dec":
      Month = 12;
      break;
  }
  //console.log(Year,Month,Day);
  return new Date(Year, Month - 1, Day + 1);
}

// To save image of vehicle after creating ride
function savePicture(fileName) {}

// function to check for pending rides
async function checkPendingRides(userId, date) {
  //console.log("Check pending is called", userId, date);
  return await Ride.findOne({
    User: userId,
    rideDate: date,
    status: "Created",
  }).find({
    $or: [{ status: "Created" }, { status: "Initiated" }],
  });
}

module.exports = {
  createRide,
  getCreatedRides,
  getRideDetails,
  getUserRides,
  deleteRide,
  savePicture,
  addTripRequest,
  getTripRequestList,
  reduceAvailableSeats,
  removeTripId,
  getTimeDifference,
  convertToDate,
  updateRideStatus,
  checkIsBooked,
  getUserDetailsByRideId,
  checkPendingRides,
};
