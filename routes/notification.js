const express = require("express");
const req = require("express/lib/request");
const router = express.Router();
const auth = require("../middleware/auth");
router.use(express.json());
const {
  Notification,
  validateNotification,
} = require("../models/notification");
const {
  createNotification,
  getNotification,
  markAsRead,
  markAllRead,
} = require("../services/notification");

// Create new  notification
router.post("/sendNotification/:userId/:message", auth, async (req, res) => {
  let toUserId = req.params.userId;
  let message = req.params.message;
  let fromUserId = req.body.User;
  let notificationDetails = {
    fromUser: fromUserId,
    toUser: toUserId,
    message: message,
  };
  let { error } = validateNotification(notificationDetails);
  if (error) return res.status(400).send(error.details[0].message);
  //console.log("###",notificationDetails);

  try {
    let newNotification = await createNotification(notificationDetails);
    // let result = await newNotification.save();
    //console.log("@@@",newNotification);

    if (!newNotification)
      return res.status(400).send(`Error in creating notification object`);
    return res.status(200).send(`Notification created ${newNotification}`);
  } catch (ex) {
    return res.status(400).send("Error to send request" + ex);
  }
});

// Return the unread notification list
router.get("/getNotifications/", auth, async (req, res) => {
  let UserId = req.body.User;
  console.log("get notification called");
  try {
    let notificationList = await getNotification(UserId);
    // console.log("###",notificationList);
    if (!notificationList)
      return res.status(400).send(`Error in getting notification object`);

    // notificationList.map(async (notification) => {
    // await markAsRead(notification._id);
    // });
    return res.status(200).send(notificationList);
  } catch (ex) {
    console.log("exception while getting notifications:".ex);
    return res.status(400).send("Error to fetch request" + ex);
  }
});

router.put("/markAsRead", auth, async (req, res) => {
  let notificationId = req.body.notificationId;
  console.log(notificationId);
  let result = await markAsRead(notificationId);
  if (!result)
    return res.status(400).send("Error in mark as read notification");
  return res.status(200).send("Marked as read done");
});

router.put("/markAllRead", auth, async function (req, res) {
  let userId = req.body.User;
  console.log(userId);
  let result = await markAllRead(userId);
  if (!result)
    return res.status(400).send("Error in mark all as read notification");
  return res.status(200).send("All marked as read done");
});
module.exports = router;
