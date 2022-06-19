const { Notification } = require("../models/notification");
const { Ride } = require("../models/ride");
const { Trip } = require("../models/trip");
const { TripRide } = require("../models/trip_ride");
const { User } = require("../models/user");
const { WalletHistory } = require("../models/wallet_history");
const { createNotification, sendPushNotification } = require("./notification");
const {
  getTimeDifference,
  reduceAvailableSeats,
  updateRideStatus,
} = require("./ride");
const {
  updateWallet,
  updateUsedCredit,
  addPenalty,
  addSafetyPoints,
} = require("./wallet");
const { addNewHistory } = require("./walletHistory");

async function addAcceptedTrip(body) {
  let tripRide = new TripRide(body);
  return tripRide.save();
}

async function getTripDetailsByRideIdAndStatus(rid, status) {
  return await TripRide.find({ rideId: rid, status: status }).populate({
    path: "tripId",
    model: Trip,
    select: "-_id User source destination",
  });
}

//function to return passengers booked trip with detail's
async function getPassengersBookedTrip(passengerId) {
  return await TripRide.find({
    passengerId: passengerId,
    status: "Booked",
  }).populate(
    "tripId",
    "-_id User source destination date time distance pickupPoint seatRequest",
    Trip
  );
}

// return all booked rides of the raider
async function getAllBookedRides(raiderId) {
  console.log("getting booked ride of rider...");
  return await TripRide.find({
    RaiderId: raiderId,
    $or: [{ status: "Booked" }, { status: "Initiated" }],
  })
    .populate(
      "PassengerId",
      "_id profile name mobileNumber notificationToken",
      User
    )
    .populate("tripId", "_id source destination pickupPoint date", Trip)
    .sort({ _id: -1 });
}

// return all booked rides of the passenger
async function getAllBookedTrips(passengerId) {
  return await TripRide.find({
    PassengerId: passengerId,
    $or: [{ status: "Booked" }, { status: "Initiated" }],
  })
    .populate(
      "RaiderId",
      "_id profile name mobileNumber notificationToken",
      User
    )
    .populate("tripId", "_id source destination pickupPoint date time", Trip)
    .sort({ _id: -1 });
}

// return all history of the passenger
async function getPassengerHistory(passengerId) {
  return await TripRide.find({
    PassengerId: passengerId,
    $or: [
      { status: "Completed" },
      { status: "Cancelled" },
      { status: "Rejected" },
    ],
  })
    .populate("RaiderId", "_id profile name mobileNumber", User)
    .populate("tripId", "source destination pickupPoint date", Trip)
    .sort({ _id: -1 });
}

// return all history of the passenger
async function getRiderHistory(riderId) {
  return await TripRide.find({
    RaiderId: riderId,
    $or: [
      { status: "Completed" },
      { status: "Cancelled" },
      { status: "Rejected" },
    ],
    // status: { $ne: "Booked" },
  })
    .populate("PassengerId", "_id profile name mobileNumber", User)
    .populate("tripId", "source destination pickupPoint date", Trip)
    .sort({ _id: -1 });
}

// if the trip is canceled by passenger
async function deleteBookedTrip(tripRideId, notificationToken) {
  let tripRideObj = await TripRide.findOne({ _id: tripRideId })
    .populate("rideId", "source destination pickupPoint date", Ride)
    .populate("PassengerId", "name", User);

  tripRideObj.date = tripRideObj.rideId.date;
  // console.log("tripRideObj:", tripRideObj);

  //setting simple sourceName and destination name for wallet history purpose
  let sourceArrary = tripRideObj.rideId.source.split(",");
  let destinationArray = tripRideObj.rideId.destination.split(",");
  let sourceName = sourceArrary[0];
  let destinationName = destinationArray[0];
  //console.log("SourceName:" + sourceName);
  //console.log("DestinationName:" + destinationName);

  let today = new Date();
  let currentTime =
    today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  //get the time difference
  let timeDifference = getTimeDifference(tripRideObj.date + ";" + currentTime);
  // console.log("time difference:" + timeDifference);
  //check if cancellation time is above 10 hrs then trip deposit will be refunded
  if (timeDifference <= 10) {
    let depositAmount = parseInt(tripRideObj.amount * 0.1);

    // update passenger wallet by applying panelty
    let updateWalletResult = await updateWallet(
      tripRideObj.PassengerId._id,
      depositAmount * -1
    );
    // console.log('====================================');
    // console.log("Deposit amount",depositAmount * -1);
    // console.log('====================================');
    if (!updateWalletResult)
      console.log("Error in update wallet in cancel trip");
    //add code to add new entry in wallet_history collection for deducted credit point
    let body = {
      User: tripRideObj.PassengerId._id,
      type: "Debit",
      message: `Cancellation charges for booked trip from ${sourceName} to ${destinationName}.`,
      amount: depositAmount,
      date: new Date().toDateString(),
    };
    let newWalletHistory = new WalletHistory(body);
    let walletHistoryResult = await newWalletHistory.save();
    if (!walletHistoryResult) console.log(walletHistoryResult);
    console.log("WalletHistory in trip ride deleteRide function");
  }

  // update passengers used credits
  let result = await updateUsedCredit(
    tripRideObj.PassengerId._id,
    tripRideObj.amount * -1
  );
  if (!result) console.log("error while adding used credit in cancel trip");

  let notificationDetails = {
    fromUser: tripRideObj.PassengerId._id,
    toUser: tripRideObj.RaiderId,
    message: `Your booked trip from ${tripRideObj.rideId.source} to ${tripRideObj.rideId.destination} is cancelled by ${tripRideObj.PassengerId.name}. `,
    notificationType: "Ride",
  };

  let newNotification = await createNotification(notificationDetails);
  if (!newNotification) {
    console.log("failed to send notification.");
    return newNotification;
  }
  //create and send push notification
  let message = {
    to: notificationToken,
    sound: "default",
    title: "Trip cancelled",
    body: `Your booked trip from ${tripRideObj.rideId.source} to ${tripRideObj.rideId.destination} is cancelled by ${tripRideObj.PassengerId.name}. `,
    data: { notificationType: "Ride" },
  };

  //send push notification
  await sendPushNotification(notificationToken, message);

  let tripObj = await Trip.findOne({ _id: tripRideObj.tripId._id });
  let updateRideResult = await reduceAvailableSeats(
    tripRideObj.rideId._id,
    tripObj.seatRequest * -1
  );
  if (!updateRideResult)
    console.log("Error in update ride seats in after cancelling trip");

  tripRideObj.status = "Rejected";
  return await tripRideObj.save();
}

// get trip ride details by TripRideId and tripId
async function updateTripStatus(tripRideId, tripId, status, notificationToken) {
  let TripRideObj = await TripRide.findOne({
    _id: tripRideId,
    tripId: tripId,
  }).populate("rideId", "source destination pickupPoint date", Ride);

  // console.log(TripRideObj.PassengerId);
  // return;
  let tripObj = await Trip.findOne({ _id: tripId });

  TripRideObj.status = status;
  let currentDate = new Date();
  let currentTime =
    currentDate.getHours() +
    ":" +
    currentDate.getMinutes() +
    ":" +
    currentDate.getSeconds();
  //console.log(time);

  //define variable according to condition for user notification
  let fromUserId, toUserId, messageContent, notificationTypeName;
  let tripRideObjectIdForMessage = null;

  if (status == "Initiated") {
    TripRideObj.startTime = currentTime;
    fromUserId = TripRideObj.RaiderId._id;
    toUserId = TripRideObj.PassengerId._id;
    (messageContent = `Your trip from ${TripRideObj.rideId.source} to ${TripRideObj.rideId.destination} is initiated.`),
      (notificationTypeName = "Trip");

    let rideObj = await Ride.findOne({ _id: TripRideObj.rideId._id });
    rideObj.status = status;
    let saveRes = await rideObj.save();
    if (!saveRes) console.log("Error in update ride status initated");
  } else if (status == "Completed") {
    // console.log("In Completd...!");
    TripRideObj.endTime = currentTime;
    fromUserId = TripRideObj.RaiderId._id;
    toUserId = TripRideObj.PassengerId._id;
    (messageContent = `Your trip from ${TripRideObj.rideId.source} to ${TripRideObj.rideId.destination} is completed.`),
      (notificationTypeName = "Trip Completed");
    tripRideObjectIdForMessage = TripRideObj._id;

    // add 90% amount to riders wallet and 10% commission will be given to DropMe.

    // let sourceArrary = TripRideObj.rideId.source.split(",");
    // let destinationArray = TripRideObj.rideId.destination.split(",");
    // let sourceName = sourceArrary[0];
    // let destinationName = destinationArray[0];

    // if the ride is free then just update the status
    if (TripRideObj.amount) {
      let sourceName = TripRideObj.rideId.source;
      let destinationName = TripRideObj.rideId.destination;

      let tripAmount = TripRideObj.amount - parseInt(TripRideObj.amount / 10);
      let updateRiderWallet = await updateWallet(
        TripRideObj.RaiderId._id,
        tripAmount
      );

      //call to updateWallet history for raider
      let riderWalletHistoryDetails = {
        User: TripRideObj.RaiderId._id,
        amount: tripAmount,
        message: `Credit point added for ride from ${sourceName} to ${destinationName}`,
        date: TripRideObj.date,
        type: "Credit",
      };

      let riderWalletHistoryDetailsResult = await addNewHistory(
        riderWalletHistoryDetails
      );

      if (!riderWalletHistoryDetailsResult)
        console.log(
          "Error in rider set wallet history",
          riderWalletHistoryDetailsResult
        );

      // deduct trip amount from passenger's wallet
      let updatePassengerWallet = await updateWallet(
        TripRideObj.PassengerId._id,
        TripRideObj.amount * -1
      );

      //call to updateWallet history for passenger
      let passengerWalletHistoryDetails = {
        User: TripRideObj.PassengerId._id,
        amount: TripRideObj.amount,
        message: `Completed trip from ${sourceName} to ${destinationName}`,
        date: TripRideObj.date,
        type: "Debit",
      };

      let passengerWalletHistoryDetailsResult = await addNewHistory(
        passengerWalletHistoryDetails
      );

      if (!passengerWalletHistoryDetailsResult)
        console.log(
          "Error in passenger set wallet history",
          passengerWalletHistoryDetailsResult
        );

      // deduct amount from passenger's Used credit
      let updateUsedCreditResult = await updateUsedCredit(
        TripRideObj.PassengerId._id,
        TripRideObj.amount * -1
      );
      // console.log("@@@ updated used credit is", updateUsedCreditResult);
      // Update the main ride status in ride table
      let updateRideResult = await updateRideStatus(
        TripRideObj.rideId._id,
        status
      );
      if (!updateRideResult)
        console.log("Error in update main ride status in update trip status");
    }
  } else {
    // apply safety points penalty to rider
    if (TripRideObj.amount) {
      let penalty = TripRideObj.amount * 0.1;
      let result = await addPenalty(TripRideObj.RaiderId, penalty);
      if (!result) console.log("error while applying penalty");
    }
    //update notification body variables
    fromUserId = TripRideObj.RaiderId._id;
    toUserId = TripRideObj.PassengerId._id;
    (messageContent = `Your trip from ${TripRideObj.rideId.source} to ${TripRideObj.rideId.destination} is cancelled by rider.`),
      (notificationTypeName = "Trip");

    //update usedCredit point of passenger and add into main wallet as rider cancelled the ride
    let result = await updateUsedCredit(
      TripRideObj.PassengerId._id,
      TripRideObj.amount * -1
    );
    if (!result) console.log("failed to update passengers used credit point");

    // Update ride seat capacity after cancelling the ride
    let rideObj = await Ride.findOne({ _id: TripRideObj.rideId._id });
    rideObj.availableSeats = rideObj.availableSeats + tripObj.seatRequest;

    let saveResult = await rideObj.save();
    if (!saveResult)
      console.log(
        "Error in updating ride capacity after cancellation trip ride"
      );
  }

  //create notification and send it to passenger

  let notificationBody = {
    fromUser: fromUserId,
    toUser: toUserId,
    message: messageContent,
    notificationType: notificationTypeName,
  };
  if (tripRideObjectIdForMessage)
    notificationBody.tripRideId = tripRideObjectIdForMessage;
  let newNotification = new Notification(notificationBody);
  let notificationResult = await newNotification.save();
  if (!notificationResult)
    console.log("error while creating notification in updateRideStatus.");

  //create and send push notification to passenger
  //create push notification
  let message = {
    to: notificationToken,
    sound: "default",
    title: "Trip " + status,
    body: messageContent,
  };

  //send push notification
  await sendPushNotification(notificationToken, message);

  return await TripRideObj.save();
}

// Set rating to a trip ride and rider
async function setRating(tripRideId, rating) {
  let tripRideObj = await TripRide.findOne({ _id: tripRideId });
  // increase the total number of rides
  let raiderObj = await User.findOne({ _id: tripRideObj.RaiderId });
  raiderObj.totalNumberOfRides = raiderObj.totalNumberOfRides + 1;

  // update rider rating , rated ride and set rating to tripRide object
  if (rating) {
    raiderObj.sumOfRating = raiderObj.sumOfRating + rating;
    raiderObj.totalNumberOfRatedRides = raiderObj.totalNumberOfRatedRides + 1;
    tripRideObj.tripRating = rating;
  }
  let saveResult = await raiderObj.save();

  // add safety points in raider wallet
  let updateSafetyPointResult = await addSafetyPoints(
    tripRideObj.RaiderId,
    rating
  );

  return await tripRideObj.save();
}

module.exports = {
  addAcceptedTrip,
  getTripDetailsByRideIdAndStatus,
  getAllBookedRides,
  getAllBookedTrips,
  getRiderHistory,
  getPassengerHistory,
  deleteBookedTrip,
  updateTripStatus,
  setRating,
  getPassengersBookedTrip,
};
