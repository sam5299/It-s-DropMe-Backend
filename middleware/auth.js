const config = require("config");
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const token = req.header("x-auth-token");
  //console.log("Token", token);
  if (!token) return res.status(401).send("Access denied. No token provided");

  try {
    let payload = jwt.verify(token, config.get("jwtPrivateKey"));
    // console.log("Payload",payload);
    req.body.userId = payload.userId;
    req.body.User = payload.User;
    //console.log("req.body:"+JSON.stringify(req.body));
    next();
  } catch (ex) {
    return res.status(400).send("Invalid token");
  }
}

module.exports = auth;
