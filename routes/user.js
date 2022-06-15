const config = require("config");
const jwt = require("jsonwebtoken");
const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();
const auth = require("../middleware/auth");
const _ = require("lodash");
const {
  getUniqueId,
  addUserUpdated,
  isUserExists,
  validateLogin,
  getUser,
  loginPasswordAuthentication,
  generateRandomPassword,
  mailSend,
  encryptPassword,
  validatePassword,
  loadProfile,
} = require("../services/user");
const { sendPushNotification } = require("../services/notification");
const { isUserDataValidate, User } = require("../models/user");
// const {
//   uploadFile,
//   uploadFileWithParam,
// } = require("../middleware/upload_file");

const { Notification } = require("../models/notification");

const { createWallet } = require("../services/wallet");
const { getNotification } = require("../services/notification");
const fileUpload = require("express-fileupload");
const { WalletHistory } = require("../models/wallet_history");
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(fileUpload({ useTempFiles: true, tempFileDir: "../image_files" }));


//register user route
router.post("/register", async (req, res) => {
  console.log("register route called..");

  try {
    let userId = await getUniqueId();
    req.body.userId = userId;

    let { error } = await isUserDataValidate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let user = await isUserExists(req.body.mobileNumber);
    if (user)
      return res
        .status(400)
        .send("You are already registered! try Login or forgot password.");
    try {
      user = await addUserUpdated(req);
      if (!user)
        return res.status(400).send("Something went wrong try again latter.");
      let walletResult = await createWallet(user._id);
      //console.log(walletResult);
      let walletHistoryBody = {
        User: user._id,
        message: "Welcome bonus",
        type: "Credit",
        date: new Date().toDateString(),
        amount: 100,
      };

      let historyObj = new WalletHistory(walletHistoryBody);
      let historyObjResult = await historyObj.save();
      if (!historyObjResult)
        console.log("Error while adding bonus history in registation");
      //add notification for new user for welcome bonus
      let notifcationBody = {
        fromUser: user._id,
        toUser: user._id,
        message: `Hii ${user.name} you got welcome bonus of 100 credit points`,
        notificationType: "Wallet",
      };

      let notification = new Notification(notifcationBody);
      let notificationResult = await notification.save();

      if (!notificationResult)
        console.log("error while creating welcome notification");

      return res.status(200).send("Registration successfull!");
    } catch (ex) {
      if (ex.name === "ValidationError") {
        console.error(Object.values(ex.errors).map((val) => val.message));
      }
      return res.status(400).send("Please fill all the details:" + ex);
    }
  } catch (ex) {
    res.status(500).send("something failed!! try again latter");
  }
});

//endpoint for user login
router.post("/login", async (req, res) => {
  console.log("Called login route!");
  console.log(req.body.notificationToken);
  let { error } = await validateLogin(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await isUserExists(req.body.mobileNumber);
  if (!user) return res.status(400).send("Invalid mobile number or password");

  let validPassword = await loginPasswordAuthentication(
    req.body.password,
    user.password
  );
  if (!validPassword)
    return res.status(400).send("Invalid mobile number or password");

  console.log("Login successfull!");
  const token = jwt.sign(
    { userId: user.userId, User: user._id },
    config.get("jwtPrivateKey")
  );
  //console.log(token);
  //  let notifications=await getNotification(user._id)
  // if(notifications)console.log("@@@"+notifications);

  //save notification
  user.notificationToken = req.body.notificationToken;
  user = await user.save();

  user = _.pick(user, [
    "name",
    "email",
    "profile",
    "gender",
    "mobileNumber",
    "sumOfRating",
    "totalNumberOfRatedRides",
  ]);

  let message = {
    to: req.body.notificationToken,
    sound: "default",
    title: "Welcome note",
    body: `Welcome ${user.name}!`,
    data: {notificationType:"Login"}
  };
  //sending push notification to user
  sendPushNotification(req.body.notificationToken, message);

  return res.header("x-auth-token", token).status(200).send(user);
});

//endpoint for forgot password
router.put("/forgotPassword", async (req, res) => {
  if (!req.body.mobileNumber)
    return res.status(404).send("mobileNumber is require");

  let user = await isUserExists(req.body.mobileNumber);
  if (!user) return res.status(400).send("Invalid mobile number!");

  let newPassword = await generateRandomPassword();
  console.log(newPassword);

  let result = await mailSend(user.email, newPassword);
  if (!result)
    return res.status(400).send("Something failed. Try again latter. ");

  user.password = await encryptPassword(newPassword);

  user = await user.save();
  if (!user) return res.status(400).send("Cannot reset password!");

  return res.status(200).send("new password:" + newPassword);
});

// route to change password of user
router.put("/changePassword", auth, async (req, res) => {
  try {
    if (!req.body.oldPassword)
      return res.status(400).send("oldPassword is required.");
    if (!req.body.newPassword)
      return res.status(400).send("newPassword is required.");

    let user = await getUser(req.body.User);
    console.log("User:" + user);
    if (!user) return res.status(400).send("cannot changed password.");

    let result = await loginPasswordAuthentication(
      req.body.oldPassword,
      user.password
    );
    if (!result) return res.status(400).send("Old password not matched.");

    let { error } = validatePassword({ password: req.body.newPassword });
    if (error) return res.status(400).send(error.details[0].message);

    user.password = await encryptPassword(req.body.newPassword);
    await user.save();
    return res.status(200).send(user);
  } catch (ex) {
    console.log(ex);
    return res.status(500).send("Something failed");
  }
});

// api to get details of user who logged in mainly will be used for profile.
router.get("/getUser", auth, async (req, res) => {
  try {
    let user = await getUser(req.body.User);
    user = _.pick(user, [
      "name",
      "email",
      "profile",
      "gender",
      "mobileNumber",
      "sumOfRating",
      "totalNumberOfRatedRides",
      "licenseNumber",
      "licenseImage",
    ]);
    console.log("getUser called..");
    if (!user) return res.status(404).send("No users present!!");
    return res.status(200).send(user);
  } catch (ex) {
    console.log("exception");
  }
});

router.get("/loadProfile", auth, async (req, res) => {
  console.log("Load profile is called");
  let userId = req.body.User;
  let profile = await loadProfile(userId);
  //console.log("Profile:", profile);
  if (!profile) {
    console.log("Error in load profile");
    return res.status(400).send("Could not load profile try after sometime..");
  }
  return res.status(200).send(profile);
});
module.exports = router;
