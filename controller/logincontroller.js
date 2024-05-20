var { url } = require("../config");
const axios = require("axios");

const logincontroller = (req, res) => {
  console.log("logincontroller");
  const user = req.body.username;
  const pass = req.body.password;
  const authentication = { username: user, password: pass };
  // console.log(`${url}/login`);
  axios
    .post(`${url}/login`, authentication)
    .then((response) => {
      console.log(response.data);
      if (response.data.auth === true) {
        var username = response.data.user;
        var userid = response.data.userid;
        if (username) {
          req.session.username = username;
          req.session.userid = userid;
          req.session.token = response.data.token;
          req.session.clientid = response.data.clientid;
          req.session.role = response.data.role;
        }

        res.redirect("/homepage");
      } else {
        res.cookie("statuscode", "401");
        res.redirect("/");
      }
    })
    .catch((err) => {
      console.log(err);
      res.cookie("statuscode", "400");
      res.redirect("/");
    });
};

module.exports = { logincontroller };
