const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Ride, validateRideDetails } = require("../models/ride");
const {
  createRide,
  getCreatedRides,
  getUserRides,
  deleteRide,
  savePicture,
  getTripRequestList,
  removeTripId,
  reduceAvailableSeats,
  getRideDetails,
  getTimeDifference,
  convertToDate,
  checkIsBooked,
  checkPendingRides,
} = require("../services/ride");

const {
  getTripDetails,
  generateTripToken,
  calculateTripAmount,
  getAllRequest,
  removeRideId,
} = require("../services/trip");
const { validateTripRide } = require("../models/trip_ride");
const { func } = require("joi");
const {
  addAcceptedTrip,
  getTripDetailsByRideIdAndStatus,
  getAllBookedRides,
  getRiderHistory,
} = require("../services/trip_ride");
const { Trip } = require("../models/trip");
const { updateUsedCredit, addPenalty } = require("../services/wallet");
const {
  createNotification,
  sendPushNotification,
} = require("../services/notification");
const { Wallet } = require("../models/wallet");
const { User } = require("../models/user");
const { getUser } = require("../services/user");
router.use(express.json());

//ride creat route
router.post("/createRide", auth, async (req, res) => {
  console.log("create ride called");
  let userId = req.body.User;
  let inpDate = convertToDate(req.body.date);
  let checkResult = await checkPendingRides(userId, inpDate);
  //console.log("Check result result:",checkResult);
  if (checkResult.length) {
    //console.log("Ride present");
    return res
      .status(400)
      .send(
        "Sorry you cannot create the ride on this day because your ride is pending please Complete/Cancel the ride"
      );
  }

  delete req.body.userId;
  let amount = 0;
  if (req.body.rideType == "Paid") {
    amount = await calculateTripAmount(req.body.Vehicle, req.body.distance);
  }
  req.body.amount = parseInt(amount);
  let distance = parseFloat(req.body.distance).toPrecision(3);
  req.body.distance = distance;
  req.body.rideDate = convertToDate(req.body.date);

  // console.log("body:", req.body);
  let { error } = validateRideDetails(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  try {
    let newRide = await createRide(req.body);
    if (!newRide)
      return res.status(400).send("Something went wrong try again latter.");

    //console.log("New ride obj", newRide);
    // After that save the ipc of created ride vehicle
    // savePicture(`${newRide.vehicleNumber}_${userId}`);
    return res.status(200).send("Your ride is created");
  } catch (ex) {
    return res.status(400).send("something failed!! try again latter:" + ex);
  }
});

// get Rides details by Source Destination Date and Time
router.get(
  "/getRides/:source/:destination/:date/:time/:seats/:gender",
  auth,
  async (req, res) => {
    let body = req.params;
    //console.log("parameters for searching ride:", body);
    console.log("Search a ride is called");
    if (
      !(
        "source" in body &&
        "destination" in body &&
        "date" in body &&
        "time" in body
      )
    )
      return res
        .status(400)
        .send("Please add Source, Destination , Date and Time");

    let Source = body.source;
    let Destination = body.destination;
    let Date = body.date;
    let Time = body.time;
    let seats = body.seats;
    let gender = body.gender;
    try {
      let rides = await getCreatedRides(
        req.body.User,
        Source,
        Destination,
        Date,
        Time,
        seats,
        gender
      );
      // console.log("@@@", rides);
      if (rides.length == 0) return res.status(400).send("No rides found");

      return res.status(200).send(rides);
    } catch (ex) {
      return res.status(500).send("something failed!! try again latter:" + ex);
    }
  }
);

//   get Rides of the particular Rider
router.get("/getUserRides", auth, async (req, res) => {
  console.log("Get user rides is called...");
  let id = req.body.User;
  try {
    let rideData = await getUserRides(id);
    let finalResult = [];
    //console.log(rideData);
    rideData.map((ride) => {
      // console.log("@@@",(ride.rideDate-new Date())/(1000*60*60*24)>0?true:false);
      if (ride.rideDate - new Date() > 0) finalResult.push(ride);
    });

    if (rideData.length == 0) return res.status(400).send("No rides found");
    // return res.status(200).send(rideData);
    return res.status(200).send(finalResult);
  } catch (ex) {
    return res.status(400).send("something failed!! try again latter:" + ex);
  }
});

//   check whether the ride is booked or not
router.get("/checkIsBooked/:rideId", auth, async (req, res) => {
  console.log("check is booked ride or not is called");
  try {
    let result = await checkIsBooked(req.params.rideId);
    //console.log("@@@",result);
    if (!result) return res.status(400).send(false);
    return res.status(200).send(result.length > 0);
  } catch (ex) {
    return res.status(400).send("something failed!! try again latter:" + ex);
  }
});

// route to get list of trip who has requested for ride
router.get("/getTripRequestList/:rid", auth, async (req, res) => {
  let rideId = req.params.rid;
  let rideObj = await Ride.findOne({ _id: rideId });
  let tripList = await getTripRequestList(rideId);
  console.log("Get trip requested list is called");
  if (!tripList)
    return res.status(404).send("No requested trip for given ride.");
  let requestedTripList = [];
  for (element of tripList.requestedTripList) {
    let result = await getTripDetails(element);
    // Send those requests which requested seats is less then available seats and
    //passenger's user credit point is less than ride object.

    // let passengerObj = await User.findOne({ _id: result.User });
    // if (!passengerObj)
    //   console.log("Error in get rider trip request of passenger");
    let walletObj = await Wallet.findOne({ User: result.User._id });
    if (!walletObj)
      console.log("Error in get wallet details in get rider trip request");

    //console.log("@@@", walletObj);

    if (
      rideObj.availableSeats >= result.seatRequest &&
      rideObj.amount <= walletObj.creditPoint - walletObj.usedCreditPoint
    )
      requestedTripList.push(result);
  }
  //console.log(requestedTripList);
  return res.status(200).send(requestedTripList);
});

//route to accept trip request
router.post("/acceptTripRequest", auth, async (req, res) => {
  //console.log("@@@", req.body);
  console.log("Accept trip request is called");
  req.body.status = "Booked";
  req.body.token = generateTripToken();
  delete req.body.userId;
  let riderName = req.body.raiderName;
  delete req.body.raiderName;
  let notificationToken = req.body.notificationToken;
  delete req.body.notificationToken;
  //get vehicle details of ride
  let vehicle = await Ride.findOne(
    { _id: req.body.rideId },
    { _id: 0, Vehicle: 1, amount: 1 }
  );

  //get trip details of trip which gonna be accept
  let trip = await Trip.findOne({ _id: req.body.tripId });

  //calculate trip cost

  if (vehicle.amount == 0) {
    // amount = await calculateTripAmount(vehicle.Vehicle, trip.distance);
    req.body.amount = 0;
  }

  // (console.log)(req.body.amount);
  req.body.date = trip.date;
  //adding RaiderId and PassengerId to req.body
  req.body.RaiderId = req.body.User;
  req.body.PassengerId = trip.User._id.toString();

  delete req.body.User;
  let { error } = validateTripRide(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  //accept trip and add tripId,rideId,RaiderId,PassengerId into trip_ride collection
  let result = await addAcceptedTrip(req.body);
  if (!result)
    return res.status(400).send("something went wrong cannot accept trip");

  //add trip amount into usedCredit as  trip is booked
  let updatedWallet = await updateUsedCredit(trip.User, req.body.amount);
  if (!updatedWallet) {
    console.log("failed to update balance.");
    return res.status(400).send("something failed!");
  }

  //change trip status of trip in trip table change status to Booked
  trip.status = "Booked";
  let tripUpdateResult = await trip.save();
  if (!tripUpdateResult)
    console.log(
      "******************************\n error while changing status of trip ******************"
    );

  // create notification to passenger
  let notificationDetails = {
    fromUser: req.body.RaiderId,
    toUser: req.body.PassengerId,
    message: `Your trip request from ${trip.source} to ${trip.destination} is accepted by ${riderName}`,
    notificationType: "Trip",
  };

  let newNotification = await createNotification(notificationDetails);
  if (!newNotification) {
    console.log("failed to send notification.");
    return res.status(400).send("something failed.");
  }

  //create push notification
  //sending push notification
  let message = {
    to: notificationToken,
    sound: "default",
    title: "Trip request accepted",
    body: `Your trip request from ${trip.source} to ${trip.destination} is accepted by ${riderName}`,
    data: {notificationType:"Trip"}
  };
  sendPushNotification(notificationToken, message);

  //update the availableSeats and reduce number of seats for accepted trip
  //console.log("trip seat request:", trip.seatRequest);
  let updatedAvailableSeatResult = await reduceAvailableSeats(
    req.body.rideId,
    trip.seatRequest
  );
  //console.log("updatedSeats:", updatedAvailableSeatResult);
  if (!updatedAvailableSeatResult) {
    console.log("failed to reduce available seats of ride.");
    return res.status(400).send("failed to updated balance");
  }
  //console.log("Updated availableSeat:" + updatedAvailableSeat);

  //remove trip id from requestedTripList in Ride collection
  let rideObj = await removeTripId(req.body.rideId, req.body.tripId);

  return res
    .status(200)
    .send({ remainingSeat: updatedAvailableSeatResult.availableSeats });
});

//route to accept/reject trip request
router.put("/rejectTripRequest", auth, async (req, res) => {
  let rideObj = await removeTripId(req.body.rideId, req.body.tripId);
  let notificationToken = req.body.notificationToken;
  //console.log(notificationToken);
  let notificationDetails = {
    fromUser: req.body.User,
    toUser: req.body.passengerId,
    message: `Your trip request from ${req.body.source} to ${req.body.destination} is rejected by ${req.body.raiderName}`,
    notificationType: "Trip",
  };

  //get trip details of trip which gonna be reject
  let trip = await Trip.findOne({ _id: req.body.tripId });
  //remove the ride id from requestedRideId array
  trip = await removeRideId(req.body.rideId, req.body.tripId);
  //check if requestedRideList is empty and then change status
  if (trip.requestedRideList.length === 0) {
    //change trip status of trip in trip table change status to Booked
    trip.status = "Rejected";
    let tripUpdateResult = await trip.save();
    if (!tripUpdateResult)
      console.log(
        "******************************\n error while changing status of trip ******************"
      );
  }

  let newNotification = await createNotification(notificationDetails);

  if (!newNotification) {
    console.log("failed to send notification.");
    return res.status(400).send("something failed.");
  }

  //create push notification
  let message = {
    to: notificationToken,
    sound: "default",
    title: "Trip request rejected",
    body: `Your trip request from ${req.body.source} to ${req.body.destination} is rejected by ${req.body.raiderName}`,
    data: {notificationType:"Trip"}
  };

  //send push notification
  sendPushNotification(notificationToken, message);

  return res.status(200).send(rideObj);
});

//route to get all accepted ride request
router.get("/getBookedRides", auth, async (req, res) => {
  let raiderId = req.body.User;
  let bookedRide = await getAllBookedRides(raiderId);
  if (!bookedRide) return res.status(400).send("No rides found");

  return res.status(200).send(bookedRide);
});

// endpoint to cancel ride
router.put("/cancelRide/:rid", auth, async (req, res) => {
  console.log("Cancel ride is called...");

  try {
    let ride = await getRideDetails(req.params.rid, req.body.User);
    if (!ride) return res.status(400).send("Invalid ride to delete");

    //get the time difference
    let timeDifference = getTimeDifference(ride.date + ";" + ride.time);
    // console.log("time difference:" + timeDifference);
    let userDetails = await User.findOne({ _id: req.body.User }, { name: 1 });
    if (!userDetails)
      console.log("Error in getting user details in cancel ride..");

    //first get the list of requests for trip and auto reject it also send notification to user
    ride.requestedTripList.forEach(async (trip) => {
      let tripObj = await Trip.findOne({ _id: trip }).populate(
        "User",
        "notificationToken",
        User
      );
      //console.log("tripObj while cancelling ride:",tripObj);
      let notificationResult = await createNotification({
        fromUser: req.body.User.toString(),
        toUser: tripObj.User._id.toString(),
        message: `Your trip request from ${tripObj.source} to ${tripObj.destination} is cancelled by ${userDetails.name}.`,
        notificationType: "Trip",
      });
      if (!notificationResult) console.log("error while sending notification");

      //create push notification and sent to passenger
      //create push notification
      let message = {
        to: tripObj.User.notificationToken,
        sound: "default",
        title: "Trip cancelled",
        body: `Your trip request from ${tripObj.source} to ${tripObj.destination} is cancelled by ${userDetails.name}.`,
        data: {notificationType:"Trip"}
      };

      //send push notification
      sendPushNotification(tripObj.User.notificationToken, message);
    });

    //second check if is there any trip pending for same ride and if yes get the tid's
    let bookedTrip = await getTripDetailsByRideIdAndStatus(
      req.params.rid,
      "Booked"
    );
    
    //loop over the bookTrip find tripId.User and update the usedCreditPoint by amount and
    //change status of trip
    if (bookedTrip) {
      bookedTrip.forEach(async (trip) => {
        let userDetails = await getUser(trip.tripId.User);
        let notificationToken = userDetails.notificationToken;
        let notificationResult = await createNotification({
          fromUser: req.body.User.toString(),
          toUser: trip.tripId.User.toString(),
          message: `Your booked trip from ${trip.tripId.source} to ${trip.tripId.destination} has been cancelled by ${userDetails.name}.!\nYour credit points will be added to your wallet shortly.`,
          notificationType: "Trip",
        });
        if (!notificationResult)
          console.log("error while sending notification");

        //create push notification for passenger to let him know about trip cancellation
        let message = {
          to: notificationToken,
          sound: "default",
          title: "Trip cancelled",
          body: `Your booked trip from ${trip.tripId.source} to ${trip.tripId.destination} has been cancelled by ${userDetails.name}.!\nYour credit points will be added to your wallet shortly.`,
          data: {notificationType:"Trip"}
        };

        //send push notification
        sendPushNotification(notificationToken, message);

          let usedCreditUpdate = await updateUsedCredit(
            trip.PassengerId._id,
            trip.amount * -1
          );
          if (!usedCreditUpdate)
            console.log("error while updating the credit balance of User.");

          //update wallet notification for passenger and update wallet history

          trip.status = "Cancelled";
          let result = await trip.save();
          if (!result) return console.log("error while changing status of trip");

          //check if cancellation time is below 10hrs if yes apply safety point penalty
          if (timeDifference <= 10) {
            let penalty = trip.amount * 0.1;
            //console.log("penalty");
            let result = await addPenalty(userDetails._id, penalty);
            if (!result) console.log("error while applying penalty");
          }
      });
    }
    ride.status = "Cancelled";
    let result = await ride.save();
    if (!result)
      return res
        .status(400)
        .send("error while cancelling ride, cannot cancel ride.");

    return res.status(200).send("Ride cancelled successfully");
  } catch (ex) {
    console.log("Exception in ride route" + ex);
    return res.status(500).send("Something failed");
  }
});

//route to get all history of raider
router.get("/getRaiderHistory", auth, async (req, res) => {
  let riderId = req.body.User;
  let riderHistory = await getRiderHistory(riderId);
  if (!riderHistory) return res.status(400).send("No history found");

  // console.log("@@@", riderHistory);
  return res.status(200).send(riderHistory);
});

//

// get Ride details by its id

// router.put('updateRide/:id', auth, async(req, res) => {
//     let rideId = req.params.id;

// })

// Delete a ride by its id
router.delete("/deleteRide/:id", auth, async (req, res) => {
  let rideId = req.params.id;
  try {
    let result = await deleteRide(rideId);
    if (result) return res.status(200).send("Ride deleted");
    else return res.status(400).send("Ride not found");
  } catch (ex) {
    return res.status(500).send("something failed!! try again later:" + ex);
  }
});

module.exports = router;
