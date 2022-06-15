//function to add new user
const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();
const fileUpload = require("express-fileupload");

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(fileUpload({ useTempFiles: true, tempFileDir: "../image_files/" }));

//function to return default path of images if not provided in req body by user
function getDefaultPath(req, docName) {
  if(docName==="Profile") return "./image_files/userProfile.webp";

  if(docName==="vehicle") {
    if(req.body.vehicleType==="Bike") return "./image_files/bike.png";
    if(req.body.vehicleType==="Car") return "./image_files/car.png";
  }

  if(docName==="rcbook") return "./image_files/credit-card.png";

  if(docName==="puc") return "./image_files/puc.jpeg";
}

//function to extract image from req body
function getFile(req, docName) {
  if (docName==="Profile") return req.files.profile;

  if (docName==="vehicle") return req.files.vehicleImage;

  if (docName==="rcbook") return req.files.rcBookImage;

  if (docName==="license") return req.files.licenseImage;

  if(docName==="puc") return req.files.pucImage;
}


function uploadFileNew(req, docType, id, docName) {
  if (!req.files || Object.keys(req.files).length === 0) {
    let filepath = getDefaultPath(req, docName);
    return filepath;
  } else {
    let filename = `${docType}_${id}_${docName}.jpg`;
    let filepath = "./image_files/" + filename;
    //console.log(filepath);
    console.log("docname:"+docName);
    let imageFile = getFile(req, docName);
    imageFile.mv(filepath, function (err) {
      if (err) return getDefaultPath(req, docName); //default filepath
    });
    console.log("final path:" + filepath);
    return filepath;
  }
}

module.exports = { uploadFileNew };
