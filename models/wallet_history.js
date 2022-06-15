const mongoose = require("mongoose");
const Joi = require("joi");

const walletHistorySchema = new mongoose.Schema({
  User: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["Credit", "Debit"], required: true },
  amount: { type: Number, required: true },
  message: { type: String, required: true },
  date: { type: String, required: true },
});

const WalletHistory = mongoose.model("wallet_history", walletHistorySchema);

function validateWalletHistoryDetails(historyData) {
  console.log("in wallet_history ", historyData);
  let joiWalletHistorySchema = Joi.object({
    type: Joi.string().required().valid("Credit", "Debit"),
    amount: Joi.number().required().min(1),
    message: Joi.string().required(),
    date: Joi.string().required(),
    User: Joi.string().required(),
  });
  return joiWalletHistorySchema.validate(historyData);
}

module.exports = { WalletHistory, validateWalletHistoryDetails };
