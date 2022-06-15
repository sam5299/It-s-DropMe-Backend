const { Wallet } = require("../models/wallet");
const Joi = require("joi");
const { addNewHistory } = require("./walletHistory");

// Create a wallet
async function createWallet(userId) {
  const newWallet = new Wallet({
    creditPoint: 100,
    usedCreditPoint: 0,
    safetyPoint: 0,
    User: userId,
  });
  return await newWallet.save();
}

// get wallet
async function getWallet(userId) {
  //const newWallet=new Wallet({ "creditPoint": 0, "safetyPoint": 0, "User": userId });
  return await Wallet.findOne({ User: userId });
}

//  Update balance by +/-number
async function updateWallet(userId, amount) {
  //console.log("in updatewallet", userId);
  let walletObj = await Wallet.findOne({ User: userId });
  //console.log(walletObj);
  walletObj.creditPoint = walletObj.creditPoint + parseInt(amount);
  return await walletObj.save();
}

//  Update updateUsedCreditPoints by +/-number
async function updateUsedCredit(userId, amount) {
  //console.log("Amount in wallet:"+amount);
  let walletObj = await Wallet.findOne({ User: userId });
  //console.log("@@@"+walletObj);
  //walletObj.usedCreditPoint = walletObj.usedCreditPoint + amount;
  walletObj.usedCreditPoint = walletObj.usedCreditPoint + amount;
  return await walletObj.save();
}

// convert safety points into credit points
async function reedemSafetyPoints(userId) {
  let [walletObj] = await Wallet.find({ User: userId });
  //console.log(walletObj);
  let addCredit=parseInt(walletObj.safetyPoint / 2);
  walletObj.creditPoint =
    walletObj.creditPoint + addCredit;
  walletObj.safetyPoint = 0;

  let walletHistoryDetails={
    User:userId,
    amount:addCredit,
    type:"Credit",
    message:"Redeem safety points",
    date:new Date().toDateString(),
  }
  let walletResult= await addNewHistory(walletHistoryDetails);
  return await walletObj.save();
}

// add safety points +/- number
async function addSafetyPoints(userId, points) {
  let [walletObj] = await Wallet.find({ User: userId });
  walletObj.safetyPoint = walletObj.safetyPoint + points;
  return await walletObj.save();
}

// apply penalty
async function addPenalty(userId, penalty) {
  let [walletObj] = await Wallet.find({ User: userId });
  //console.log(walletObj);
  // walletObj.creditPoint=walletObj.creditPoint+walletObj.safetyPoint;
  walletObj.safetyPoint = walletObj.safetyPoint + parseInt(penalty);
  return await walletObj.save();
}

// //function to validate reedeemSafetyPoint body
// function validationReedeemSafetPointBody(body) {
//   const joiReedeemSafetyPointSchema = new Joi.object({
//     safetyPoint: Joi.number().required(),
//     creditPoint: Joi.number().required(),
//     User: Joi.string().required(),
//   });
//   return joiReedeemSafetyPointSchema.validate(details);
// }

module.exports = {
  createWallet,
  updateWallet,
  updateUsedCredit,
  reedemSafetyPoints,
  addPenalty,
  getWallet,
  addSafetyPoints,
};
