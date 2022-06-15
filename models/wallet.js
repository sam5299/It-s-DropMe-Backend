const mongoose = require('mongoose')
const Joi = require('joi');


const walletSchema = new mongoose.Schema({
    creditPoint: { type: Number, required: true },
    usedCreditPoint: { type: Number, required: true },
    safetyPoint: { type: Number, require: true },
    User: { type: String, required: true }
})


const Wallet =  mongoose.model('Wallet', walletSchema);
 
function validateWalletDetails(details){
    const joiWalletSchemas=new Joi.object({
        creditPoint:Joi.number().required(),
        safetyPoint:Joi.number().required(),
        usedCreditPoint:Joi.number().required(),
        User:Joi.string().required()
    })
    return joiWalletSchemas.validate(details);

}

module.exports = { Wallet, validateWalletDetails };