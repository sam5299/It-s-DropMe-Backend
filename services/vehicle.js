const {Vehicle} = require('../models/vehicle');
const {Ride} = require("../models/ride");
const fs = require('fs');

//function to check if vehicle number already exists 
async function checkVehicleAlreadyExits(vno) {
    let vehicleObj= await Vehicle.findOne({vehicleNumber:vno});
    return vehicleObj;
}

//function to add vehicle
async function addVehicle(body) {
    const vehicle = new Vehicle(body);
    return await vehicle.save();
}

//function to get list of vehicle and vehicle class of particular user
async function getVehicleList(userId) {
    return await Vehicle.find({userId:userId , isDeleted:false , isVerified:true });
}

//function to getVehicleDetails by vehicle number
async function getVehicleDetails(vehicleNumber) {
    return await Vehicle.findOne({vehicleNumber: vehicleNumber ,isDeleted:false });
}

//function to delete images of vehicle and rcbook after
function deleteVehicleImages(imagePath) {
    console.log("image path delete: "+imagePath);
    if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
            if (err) {
                return false;
            }
            console.log(`${imagePath} is deleted`);
            return true;
        })
    }
}

//function to check is there any ride presnet using this vehicle
async function isRidePresentWithVehicle(vehicleNumber) {
    console.log("Vehicle number:"+vehicleNumber);
    let ride = await Ride.find({vehicleNumber:vehicleNumber});
    console.log("Ride detail's:"+ride);
    if(ride.length==0) return false;
    return true;
}

//function to remove vehicle from Vehicle collection
async function deleteVehicle(vehicleDetails) {
    try {
       // let deleteResultVehicleImage = deleteVehicleImages(vehicleDetails.vehicleImagePath);
        // console.log(`Vehicle image of vehicle number ${vehicleDetails.vehicleNumber} delete ${deleteResultVehicleImage}`);
        // console.log(vehicleDetails.rcBookImagePath);
        //let result = deleteVehicleImages(vehicleDetails.rcBookImagePath);
        // console.log(`RcBook of vehicle number ${vehicleDetails.vehicleNumber} delete ${result}`);
        let vehicleObj = await Vehicle.findOne({vehicleNumber:vehicleDetails.vehicleNumber});
        vehicleObj.isDeleted=true;
        return await vehicleObj.save()
    } catch(ex) {
        return ex;  
    }
}

module.exports = {checkVehicleAlreadyExits, addVehicle, getVehicleList, getVehicleDetails, deleteVehicle, isRidePresentWithVehicle};