const express = require("express");
const router = express.Router();
const _ = require("lodash");
const bodyParser = require("body-parser");
const auth = require("../middleware/auth");
const { uploadFileNew } = require("../middleware/upload_file");
const { Vehicle, validateVehicleDetails } = require("../models/vehicle");
const {
  checkVehicleAlreadyExits,
  addVehicle,
  getVehicleList,
  getVehicleDetails,
  deleteVehicle,
  isRidePresentWithVehicle,
} = require("../services/vehicle");
const {
  uploadFile,
  uploadFileWithParam,
} = require("../middleware/upload_file");
const {
  validateLicenseNumber,
  updateUserLicenseDetails,
  isLicenseDetailsPresent,
  isLicenseNumberExists,
} = require("../services/user");

const fileUpload = require("express-fileupload");
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(fileUpload({ useTempFiles: true, tempFileDir: "../image_files" }));

// router.get("/getVehicle", auth, (req, res) => {
//     console.log("getVehicle called");
//     return res.status(200).send("getVehicle called");
// });

// route to add new vehicle for logged in user
router.post("/addVehicle", auth, async (req, res) => {
  delete req.body.User;
  console.log("add Vehicle called....");
  try {
    //check if vehicle with same number already present in database or not
    let vehicle = await checkVehicleAlreadyExits(req.body.vehicleNumber);
    if (vehicle != null && vehicle.isDeleted === false) {
      return res.status(400).send("Vehicle already exists,cannot add!");
    }

    if ("licenseNumber" in req.body && "licenseImage" in req.body) {
      console.log("licenseNumber and licenseImage is present");
      let { error } = await validateLicenseNumber({
        licenseNumber: req.body.licenseNumber,
      });
      if (error) return res.status(400).send(error.details[0].message);
      console.log("licenseNumber validation done.");
      let isLicenseNumberPresent = await isLicenseNumberExists(
        req.body.licenseNumber
      );
      if (isLicenseNumberPresent)
        return res.status(400).send("License number already present");
      console.log("License number is not present");
      let updatedUser = await updateUserLicenseDetails(
        req.body.userId,
        req.body.licenseNumber,
        req.body.licenseImage
      );
      if (!updatedUser)
        return res
          .status(400)
          .send("Something went wrong cannot add license detail's.");
    }
    console.log("License document update done.!");
    let newBody = _.pick(req.body, [
      "vehicleName",
      "vehicleNumber",
      "vehicleType",
      "seatingCapacity",
      "vehicleClass",
      "vehicleImage",
      "rcBookImage",
      "pucImage",
      "fuelType",
      "userId",
    ]);

    req.body = newBody;

    let { error } = validateVehicleDetails(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // let vehicle = await checkVehicleAlreadyExits(req.body.vehicleNumber);
    if (vehicle != null) {
      if (vehicle.isDeleted == false)
        return res.status(400).send("Vehicle already exists, cannot add!");
      if (vehicle.userId != parseInt(req.body.userId)) {
        vehicle.userId = parseInt(req.body.userId);
        vehicle.rcBookImage = req.body.rcBookImage;
        vehicle.pucImage = req.body.pucImage;
      }
      vehicle.isDeleted = false;
      let result = await vehicle.save();
      return res.status(200).send(result);
    }
    vehicle = await addVehicle(req.body);
    if (!vehicle)
      return res
        .status(400)
        .send("Something went wrong.Cannot add vehicle try again latter.");
    console.log("Backend vehicle add done.");
    return res.status(200).send(vehicle);
  } catch (ex) {
    console.log(ex);
    return res.status(500).send("Something went wrong.");
  }
});

//endpoint to get vehicle list of particular user
router.get("/getVehicleList", auth, async (req, res) => {
  console.log("Get vehicle list is called"); // + JSON.stringify(req.body));
  let vehicleList = await getVehicleList(req.body.userId);
  //console.log("vehicle backend:", vehicleList);
  if (vehicleList.length == 0) return res.status(404).send("No vehicles found");
  return res.status(200).send(vehicleList);
});

//endpoint to delete vehicle of user by vehicle number
router.delete("/deleteVehicle/:vehicleNumber", auth, async (req, res) => {
  let vehicleDetails = await getVehicleDetails(req.params.vehicleNumber);

  if (!vehicleDetails)
    return res
      .status(404)
      .send("Vehicle with given vehicle number does not exists.");

  let isRidePresent = await isRidePresentWithVehicle(
    vehicleDetails.vehicleNumber
  );
  if (isRidePresent)
    return res
      .status(400)
      .send(
        "You cannot remove vehicle which have pending rides. Cancel rides or try after completing rides."
      );

  let deleteResult = await deleteVehicle(vehicleDetails);

  return res.status(200).send("Vehicle Deleted Successfully!");
});

module.exports = router;
