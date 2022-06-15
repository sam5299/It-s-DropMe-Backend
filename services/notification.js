const res = require("express/lib/response");
const { Notification } = require("../models/notification");
// import Expo server sdk for sending push notification to user
const { Expo } = require("expo-server-sdk");

async function createNotification(details) {
  //console.log(details);
  let newNotification = new Notification(details);
  return await newNotification.save();
}

async function getNotification(userId) {
  let notificationList = await Notification.find({
    toUser: userId,
    isRead: false,
  }).sort({ _id: -1 });
  //if (notificationList.length == 0) return ["No any notifications"];
  return notificationList;
}

async function markAsRead(notificationId) {
  let notification = await Notification.findOne({ _id: notificationId });
  if (notification) {
    notification.isRead = true;
    return await notification.save();
  }
  //if(notificationList.length==0)
  //return ["No any notifications"];
}

async function markAllRead(userId) {
  return await Notification.updateMany(
    { toUser: userId },
    { $set: { isRead: true } }
  );
  // if(!result) return "something failed!";
  // return "Done";
}

//function to send push notification
async function sendPushNotification(pushToken, messageBody) {
  //create expo object
const expo = new Expo();
console.log('sendPushNotification called!');

  if (!Expo.isExpoPushToken(pushToken)) {
    console.log("invalid expo push token");
  } else {
    let messages = [];
    messages.push(messageBody);
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        //console.log(ticketChunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(error);
      }
    }

    let receiptIds = [];
    for (let ticket of tickets) {
      if (ticket.id) {
        receiptIds.push(ticket.id);
      }
    }
    let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    for (let chunk of receiptIdChunks) {
      try {
        let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        //console.log(receipts);

        // notification and information about an error, if one occurred.
        for (let receiptId in receipts) {
          let { status, message, details } = receipts[receiptId];
          if (status === "ok") {
            continue;
          } else if (status === "error") {
            console.error(
              `There was an error sending a notification: ${message}`
            );
            if (details && details.error) {
              console.error(`The error code is ${details.error}`);
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  }
}

module.exports = {
  createNotification,
  getNotification,
  markAsRead,
  markAllRead,
  sendPushNotification
};
