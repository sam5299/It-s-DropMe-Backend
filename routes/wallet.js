//const config = require("config");
//const jwt = require("jsonwebtoken");
const express = require("express");
//const bodyParser = require("body-parser");
const router = express.Router();
const auth = require("../middleware/auth");
const { Wallet, validateWalletDetails } = require("../models/wallet");
const {
  createWallet,
  updateWallet,
  addPenalty,
  getWallet,
  reedemSafetyPoints,
} = require("../services/wallet");

router.use(express.json());

// create the wallet object
router.post("/createWallet", auth, async (req, res) => {
  let { error } = validateWalletDetails({
    creditPoint: 0,
    safetyPoint: 0,
    usedCreditPoint: 0,
    User: req.body.User,
  });
  if (error) return res.status(400).send(error.details[0].message);
  try {
    let newWallet = await createWallet(req.body.User);
    if (!newWallet)
      return res.status(400).send("Something went wrong try again latter:");
    return res.status(200).send(newWallet);
  } catch (err) {
    return res.send("Error in creating wallet:", err.message);
  }
});

// Update wallet balance with positive or negative number
router.put("/updateBalance/:amount", auth, async (req, res) => {
  let amount = req.params.amount;
  try {
    let updateResult = await updateWallet(req.body.User, amount);
    // if (updateResult == null)
    //     return res.status(400).send("Error in updating balance please try after time");
    // let res =await addPenalty(req.body.User,100);
    return res.status(200).send(updateResult);
  } catch (ex) {
    return res.status(500).send("Error", ex);
  }
});

// Convert safety points into credit points
router.put("/reedeemSafetyPoints", auth, async (req, res) => {
  console.log("Redeem safety points is called..");
  try {
    let updateResult = await reedemSafetyPoints(req.body.User);
    if(!updateResult)
    return res.status(400).send("Error in redeem safety points please try after some time...")
    return res.status(200).send(updateResult);
  } catch (ex) {
    console.log("Exception in redeem safety points",ex.message);
    return res.status(400).send(ex.message);
  }
});

//get wallet details
router.get("/getWalletDetails", auth, async (req, res) => {
  try {
    let result = await getWallet(req.body.User);
    if (!result) res.status(400).send("error while loading wallet details");
    console.log("Get wallet called");
    return res.status(200).send(result);
  } catch (ex) {
    console.log("In wallet routes, getWalletDetails " + ex.message);
    return res.status(400).send(ex.message);
  }
});

//route to convert safety point into credit point and removing safety points from users wallet
// router.put("/reedeemSafetyPoints", auth, async (req, res) => {
//   delete req.body.userId;
//   try {
//     let {error} = validationReedeemSafetPointBody(req.body);
//     if(error) res.status(400).send(error.details[0].message);

//     let tempCredit = parseInt(req.body.safetyPoint);

//   } catch (ex) {
//     console.log("in wallet routes, reedeemSafetyPoints route.");
//     return res.status(400).send("Failed to reedeem safety points!");
//   }
// });

module.exports = router;
