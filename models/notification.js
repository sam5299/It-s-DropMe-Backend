const mongoose = require("mongoose");
const Joi = require("joi");

const notificationSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  notificationType: {
    type: String,
    required: true,
  },
  tripRideId: {
    type: String,
    default: null,
  },
});

const Notification = mongoose.model("Notification", notificationSchema);

function validateNotification(details) {
  const notificationSchema = new Joi.object({
    fromUser: Joi.string().required(),
    toUser: Joi.string().required(),
    message: Joi.string().required(),
    notificationType: Joi.string().required(),
  });
  return notificationSchema.validate(details);
}

module.exports = { Notification, validateNotification };
