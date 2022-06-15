const {
  WalletHistory,
  validateWalletHistoryDetails,
} = require("../models/wallet_history");

//method to add new entry in wallet history collection
async function addNewHistory(body) {
  let newHistoryObj= await new WalletHistory(body);
  // console.log('====================================');
  // console.log(newHistoryObj);
  // console.log('====================================');
  return await newHistoryObj.save()
}

//method to get history of user
async function getUserWalletHistory(userId) {
  return WalletHistory.find({ User: userId }).sort({_id:-1});
}


module.exports = { addNewHistory, getUserWalletHistory };
