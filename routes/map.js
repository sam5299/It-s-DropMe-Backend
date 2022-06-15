const express = require("express");
const axios = require("axios");
const router = express.Router();

//route to get location object
router.get("/api/search", async (req, res) => {
  //console.log("Called:" + req.query.location);
  let apiKey = "pk.6d364145872ca7f6b7329a6eff785cbe";
  try {
    const endpoint = `https://api.locationiq.com/v1/autocomplete.php?key=${apiKey}&q=${
      req.query.location
    }&limit=${req.query.limit || 50}&countrycodes=${req.query.countrycodes}`;
    //console.log(endpoint);
    const { data } = await axios.get(endpoint);

    if (data) {
      //console.log(data);
      return res.send(data);
    }
    res.send([]);
  } catch (error) {
    res.send([]);
  }
});

//route for reverse geocoding and get whole latitude, longitude
router.get("/api/reverseCoding/:latitude/:longitude", async (req, res) => {
  console.log("Getting Lat and Lon");
  let apiKey = "pk.6d364145872ca7f6b7329a6eff785cbe";
  let latitude = req.params.latitude;
  let longitude = req.params.longitude;
  //console.log("latitude" + latitude);
  //console.log("longitude");
  try {
    const endpoint = `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${latitude}&lon=${longitude}&format=json`;
    const { data } = await axios.get(endpoint);

    if (data) {
      //console.log(data);
      return res.send(data);
    }
    res.send([]);
  } catch (error) {
    res.send([]);
  }
});

//route to get distance between two latitude and longitude
router.get("/api/directionApi/:lon1/:lat1/:lon2/:lat2", async (req, res) => {
  console.log("Getting distance ");
  let apiKey = "pk.6d364145872ca7f6b7329a6eff785cbe";
  let lon1 = req.params.lon1;
  let lat1 = req.params.lat1;
  let lon2 = req.params.lon2;
  let lat2 = req.params.lat2;
  try {
    const endpoint = `https://us1.locationiq.com/v1/directions/driving/${lon1},${lat1};${lon2},${lat2}?key=${apiKey}&overview=full`;
    //console.log("Endpoint:" + endpoint);
    const { data } = await axios.get(endpoint);
    if (data) {
      let distArray = [];
      let distance = data.routes[0].distance;
      distance = distance / 1000;
      distArray.push(distance);
      // res.send("" + distance);
      return res.send(distArray);
    } else {
      return res.send([]);
    }
  } catch (error) {
    console.log("exception called:" + error);
    return res.send([]);
  }
});

module.exports = router;
