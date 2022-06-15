const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  validateWalletHistoryDetails,
  WalletHistory,
} = require("../models/wallet_history");
const { updateWallet } = require("../services/wallet");
const {
  addNewHistory,
  getUserWalletHistory,
} = require("../services/walletHistory");

//router to add new wallet history into collection
router.post("/addHistory", auth, async (req, res) => {
  try {
    console.log("In add history");
    req.body.amount = parseFloat(req.body.amount);
    req.body.type = "Credit";
    delete req.body.userId;
    const { error } = validateWalletHistoryDetails(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    console.log("addHistorY validation done.");
    //update wallet
    let updateResult = await updateWallet(req.body.User, req.body.amount);
    if (!updateResult) res.status(400).send("Failed to add credit points");
    //add into wallet history
    let newHistory = new WalletHistory(req.body);
    let result = await newHistory.save();
    // console.log(result);
    if (!result)
      return res
        .status(400)
        .send("something failed while adding history in wallet");

    console.log("Add History done.");
    return res.status(200).send("Add wallet history done");
  } catch (exception) {
    console.log("in catch block walletHistory route addHistory route");
    console.log(exception.message);
    res.status(400).send("something failed");
  }
});

//router to get history of wallet of user
router.get("/getWalletHistory", auth, async (req, res) => {
  try {
    let result = await getUserWalletHistory(req.body.User);
    if (!result) return res.status(400).send("Failed to get history..");

    if (result.length == 0) return res.status(400).send("No wallet history..");

    return res.status(200).send(result);
  } catch (exception) {
    console.log("exception in walletHistory route, getWalletHistory route");
    res.status(400).send("Something failed, while getting history.");
  }
});

module.exports = router;
