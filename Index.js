const express = require("express");
var JSAlert = require("js-alert");
const { url } = require("./config");
const app = express();
const ejs = require("ejs");
const path = require("path");
const axios = require("axios");
const csurf = require("csurf");
const cookie = require("cookie-parser");
// const port=process.env.PORT || 5000;
const oneDay = 1000 * 60 * 60 * 24; // this is milisecond of a day.
const session = require("express-session");
const readXlsxFile = require("read-excel-file/node");
const loginroute = require("./routes/loginroute.js");
const fs = require("fs");
const formidable = require("formidable");
const multer = require("multer");
const { response } = require("express");
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + "/Public/");
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`);
  },
});
var uploadFile = multer({ storage: storage });
app.use(
  session({
    secret: "hello world",
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
  })
); //this will encrypt secret key "hello world" and store the session at SERVER.

app.set("view engine", "ejs"); //it shows that the pages are not in html but in ejs. In ejs we can incororate java script.
app.use(express.static(path.join(__dirname, "/Public"))); //giving access to Public folder.
app.use("/images", express.static(path.join(__dirname, "/Public/images.png")));
app.use(express.urlencoded({ extended: true }));
app.use(cookie());
const unless = (path, middleware) => {
  return (req, res, next) => {
    if (path === req.path) {
      return next();
    } else {
      return middleware(req, res, next);
    }
  };
}; // It checks CSRF (Cross Site Request Forgery) Token generated and stored at client PC.
app.use(unless("/addbulklead", csurf({ cookie: { httpOnly: true } })));
// app.use(csurf({cookie:{httpOnly:true}}))

app.set("views", __dirname + "/views");

//This code will run when the website is open. If the uer login withing 24 hrs, it will not ask for password.
app.get("/", (req, res) => {
  if (req.session.username) {
    axios.post(`${url}/session`, req.session).then((response) => {
      if (response.data.status === 200 && response.data.auth === true) {
        res.redirect("/homepage");
      }
    });
  } else {
    if (req.cookies.statuscode === "401") {
      res.clearCookie("statuscode");
      return res.render("index", {
        msg: "Wrong Credentials",
        csrftoken: req.csrfToken(),
      });
    }
    var csrfToken = req.csrfToken();
    res.render("index", { msg: "", csrftoken: csrfToken });
  }
});

app.use("/", loginroute); // check user name and password. It will go to routes -> loginroute.js

app.get("/homepage", async (req, res) => {
  if (req.session.userid) {
    await axios
      .get(
        `${url}/lead/${req.session.token}/${req.session.username}/client/?userid=${req.session.userid}&status=false`
      )
      .then((response) => {
        var a = [];
        if (response.data.message) {
          for (var i in response.data.data) {
            a.push(response.data.data[i]);
          }
        }
        res.render("homepage", {
          csrftoken: req.csrfToken(),
          user: req.session.username,
          token: req.session.token,
          userid: req.session.userid,
          role: req.session.role,
          response: a,
        });
      });
  } else {
    res.redirect("/");
  }
}); // Fetch leads and display.

app.get("/Import_Leads", (req, res) => {
  res.render("Import_Leads", {
    user: req.session.username,
    userid: req.session.userid,
    role: req.session.role,
  });
});

app.get("/AddNewLead", (req, res) => {
  if (req.cookies.status1) {
    res.clearCookie("status1");
    res.clearCookie("status2");
    res.render("AddNewLead", {
      user: req.session.username,
      role: req.session.role,
      csrftoken: req.csrfToken(),
      msg: "Lead Added",
      msg1: "",
    });
  } else if (req.cookies.status2) {
    res.clearCookie("status2");
    res.clearCookie("status1");
    res.render("AddNewLead", {
      user: req.session.username,
      role: req.session.role,
      csrftoken: req.csrfToken(),
      msg: "",
      msg1: "Lead Added",
    });
  } else {
    res.render("AddNewLead", {
      user: req.session.username,
      role: req.session.role,
      csrftoken: req.csrfToken(),
      msg: "",
      msg1: "",
    });
  }
});

app.get("/User", (req, res) => {
  res.render("User", {
    msg: "",
    user: req.session.username,
    msg: "",
    role: req.session.role,
    clientid: req.session.clientid,
    csrftoken: req.csrfToken(),
  });
});

app.get("/Product", (req, res) => {
  if (req.cookies.Batch) {
    res.clearCookie("Batch");
    res.clearCookie("Product");
    res.render("Product", {
      user: req.session.username,
      msg: "Batch Added",
      role: req.session.role,
      clientid: req.session.clientid,
      csrftoken: req.csrfToken(),
    });
  } else if (req.cookies.Product) {
    res.clearCookie("Batch");
    res.clearCookie("Product");
    res.render("Product", {
      user: req.session.username,
      msg: "Product Added",
      role: req.session.role,
      clientid: req.session.clientid,
      csrftoken: req.csrfToken(),
    });
  } else {
    res.render("Product", {
      user: req.session.username,
      msg: "",
      role: req.session.role,
      clientid: req.session.clientid,
      csrftoken: req.csrfToken(),
    });
  }
});

app.get("/AddDeleteProduct", (req, res) => {
  res.render("AddDeleteProduct", {
    user: req.session.username,
    role: req.session.role,
    userid: req.session.userid,
  });
});

app.get("/Logout", (req, res) => {
  req.session.destroy();
  res.render("index", {
    csrftoken: req.csrfToken(),
    msg: "Logout Successfull",
  });
});

app.get("/forgetpassword", (req, res) => {
  res.render("forgetpassword", { csrftoken: req.csrfToken(), msg: "" });
});

app.post("/forgetpassword", async (req, res) => {
  const username = req.body.username;
  const authentication = { username: username };
  await axios.post(`${url}/forgetpassword`, authentication).then((response) => {
    if (response.data.auth === true) {
      var user = response.data.user;
      var id = response.data.userid;
      res.cookie("userid", id);
      return res.render("passwordfield", {
        msg: "",
        csrftoken: req.csrfToken(),
      });
    } else {
      res.render("forgetpassword", {
        csrftoken: req.csrfToken(),
        msg: "Not found",
      });
    }
  });
});

app.post("/password", async (req, res) => {
  const password = req.body.password;
  const repassword = req.body.repassword;
  if (password === repassword) {
    const { userid } = req.cookies;
    const parameter = {
      password: password,
      userid: userid,
    };
    await axios
      .post(`${url}/forgetpassword/password`, parameter)
      .then((response) => {
        res.clearCookie("userid");
        res.render("index", {
          msg: "Password Change",
          csrftoken: req.csrfToken(),
        });
      });
  } else {
    res.render("passwordfield", {
      msg: "Password don't match",
      csrftoken: req.csrfToken(),
    });
  }
});

app.post("/addlead", (req, res) => {
  var body = {
    LeadName: req.body.leadname,
    LeadDate: req.body.leaddate,
    LeadSource: req.body.Source,
    LeadNote: req.body.leadnote,
    LeadStatus: req.body.status,
    LeadStatusDate: req.body.statusdate,
    NextFollowUpDate: req.body.nextfollowupdate,
    LeadType: req.body.Organtype,
    CompanyName: req.body.orgname,
    UserID: req.session.userid,
    ClientID: req.session.clientid,
    Status: false,
  };
  var number = req.body.mobilenumber;
  var email = req.body.email;
  axios
    .post(`${url}/lead/${req.session.token}/${req.session.username}`, body)
    .then((response) => {
      for (var i in number) {
        if (number[i]) {
          axios
            .post(
              `${url}/mobile/${req.session.token}/${req.session.username}`,
              {
                LeadID: response.data.leadid,
                ClientID: req.session.clientid,
                CountryCode: "+91",
                MobileNo: number[i],
              }
            )
            .then((response) => {})
            .catch((err) => {
              res.cookie("status1", false);
              res.redirect("/AddNewLead");
            });
        }
      }
      for (var i in email) {
        if (email[i]) {
          axios
            .post(`${url}/email/${req.session.token}/${req.session.username}`, {
              LeadID: response.data.leadid,
              ClientID: req.session.clientid,
              Email: email[i],
            })
            .then((response) => {})
            .catch((err) => {
              res.cookie("status1", false);
              res.redirect("/AddNewLead");
            });
        }
      }
    })
    .catch((err) => {
      res.cookie("status1", false);
      res.redirect("/AddNewLead");
    });
  res.cookie("status1", true);
  res.redirect("/AddNewLead");
  //  res.render('AddNewLead',{user:req.session.username,csrftoken:req.csrfToken(),msg:"Lead Added",msg1:""});
});

app.get("/seedetails/:id", async (req, res) => {
  if (req.session.userid) {
    var LeadName;
    var LeadSource;
    var LeadNote;
    var LeadType;
    var LeadStatus;
    var LeadStatusDate;
    var CompanyName;
    var NextFollowUpDate;
    var mobilenumber = [];
    var email = [];
    await axios
      .get(
        `${url}/lead/${req.session.token}/${req.session.username}/${req.params.id}`
      )
      .then(async (res) => {
        var data = res.data.data;
        for (var i in data) {
          LeadName = data[i].LeadName;
          LeadSource = data[i].LeadSource;
          LeadNote = data[i].LeadNote;
          LeadType = data[i].LeadType;
          LeadStatus = data[i].LeadStatus;
          LeadStatusDate = data[i].LeadStatusDate;
          CompanyName = data[i].CompanyName;
          NextFollowUpDate = data[i].NextFollowUpDate;
        }
        await axios
          .get(
            `${url}/mobile/${req.session.token}/${req.session.username}/${req.params.id}`
          )
          .then((response) => {
            if (response.data.message) {
              for (var i in response.data.data) {
                var mobileid = response.data.data[i].MobileID;
                var cc = response.data.data[i].CountryCode;
                var mobile = response.data.data[i].MobileNo;
                var mobile1 = [];
                mobile1.push(mobileid);
                mobile1.push(cc.toString() + mobile);
                mobilenumber.push(mobile1);
              }
            }
          })
          .catch((err) => {});
        await axios
          .get(
            `${url}/email/${req.session.token}/${req.session.username}/${req.params.id}`
          )
          .then((response) => {
            if (response.data.message) {
              for (var i in response.data.data) {
                var emailid = response.data.data[i].EmailID;
                var cc = response.data.data[i].Email;
                email.push([emailid, cc]);
              }
            }
          })
          .catch((err) => {});
      })
      .catch((err) => {});
    var details = {
      LeadID: req.params.id,
      LeadName: LeadName,
      LeadSource: LeadSource,
      LeadNote: LeadNote,
      LeadType: LeadType,
      LeadStatus: LeadStatus,
      LeadStatusDate: LeadStatusDate,
      CompanyName: CompanyName,
      NextFollowUpDate: NextFollowUpDate,
      mobilenumber: mobilenumber,
      email: email,
      ClientID: req.session.clientid,
    };

    res.render("details", { details: details, csrftoken: req.csrfToken() });
  } else {
    res.redirect("/");
  }
});

// add single user
app.post("/addUser", (req, res) => {
  if (req.body.password === req.body.rpassword) {
    var data = {
      ClientID: req.session.clientid,
      UserName: req.body.Username,
      UserPass: req.body.password,
      UserRole: req.body.Roles,
    };
    axios
      .post(`${url}/user/${req.session.token}/${req.session.username}`, data)
      .then((response) => {
        res.render("User", {
          user: req.session.username,
          msg: "lead added",
          role: req.session.role,
          clientid: req.session.clientid,
          csrftoken: req.csrfToken(),
          msg: "User Added",
        });
      })
      .catch((err) => {
        res.render("User", {
          user: req.session.username,
          msg: "lead not added",
          role: req.session.role,
          clientid: req.session.clientid,
          csrftoken: req.csrfToken(),
          msg: "User not Added",
        });
      });
  } else {
    res.render("User", {
      user: req.session.username,
      msg: "Password not match",
      role: req.session.role,
      clientid: req.session.clientid,
      csrftoken: req.csrfToken(),
      msg: "Password not Match",
    });
  }
});

// import leads from excel
app.post("/addbulklead", uploadFile.single("uploadfile"), async (req, res) => {
  //call uploadFile.single and store excel file in Public folder on server and then read that file.
  if (req.file == undefined) {
    return res.status(400).send("Please upload an excel file!");
  }
  let path = __dirname + "/Public/" + req.file.originalname;
  readXlsxFile(path)
    .then((rows) => {
      rows.shift();
      rows.forEach(async (row) => {
        var number = [];
        var email = [];
        let lead = {
          ClientID: req.session.clientid,

          LeadDate: row[1],
          LeadName: row[2],
          LeadSource: row[3],
          LeadNote: row[4],
          NextFollowUpDate: row[5],
          LeadType: row[6],
          CompanyName: row[7],
          Status: false,
        };
        number.push(row[8]);
        number.push(row[9]);
        email.push(row[10]);
        email.push(row[11]);
        await axios
          .post(
            `${url}/lead/${req.session.token}/${req.session.username}`,
            lead
          )
          .then(async (response) => {
            for (var i in number) {
              if (number[i]) {
                await axios
                  .post(
                    `${url}/mobile/${req.session.token}/${req.session.username}`,
                    {
                      LeadID: response.data.leadid,
                      ClientID: req.session.clientid,
                      CountryCode: "+91",
                      MobileNo: number[i],
                    }
                  )
                  .then(async (response) => {})
                  .catch((err) => {
                    res.cookie("status2", false);
                    res.redirect("/AddNewLead");
                    return;
                  });
              }
            }
            for (var i in email) {
              if (email[i]) {
                await axios
                  .post(
                    `${url}/email/${req.session.token}/${req.session.username}`,
                    {
                      LeadID: response.data.leadid,
                      ClientID: req.session.clientid,
                      Email: email[i],
                    }
                  )
                  .then((response) => {})
                  .catch((err) => {
                    res.cookie("status2", false);
                    res.redirect("/AddNewLead");
                    return;
                  });
              }
            }
          })
          .catch((err) => {
            res.cookie("status2", false);
            res.redirect("/AddNewLead");
            return;
          });
      });
      fs.unlink(path, () => {
        // delete excel file stored in Public folder.
      });
    })
    .catch((error) => {
      res.cookie("status2", false);
      res.redirect("/AddNewLead");
      return;
    });

  res.cookie("status2", true);
  res.redirect("/AddNewLead");
});

app.post("/addProduct", (req, res) => {
  var ClientID = req.session.clientid;
  var ProdName = req.body.ProdName;
  var data = {
    ClientID: ClientID,
    ProdName: ProdName,
  };
  axios
    .post(`${url}/product/${req.session.token}/${req.session.username}`, data)
    .then((response) => {
      if (response.data.message) {
        res.cookie("Product", true);

        res.redirect("/Product");
      } else {
        res.cookie("Product", false);

        res.redirect("/Product");
      }
    })
    .catch((err) => {
      res.cookie("Product", false);

      res.redirect("/Product");
    });
});

app.post("/addBatch", (req, res) => {
  var data = {
    ProdID: req.body.ProdID,
    ClientID: req.session.clientid,
    FromDate: req.body.FromDate,
    ToDate: req.body.EndDate,
  };
  axios
    .post(`${url}/batch/${req.session.token}/${req.session.username}`, data)
    .then((response) => {
      if (response.data.message) {
        res.cookie("Batch", true);

        res.redirect("/Product");
      } else {
        res.cookie("Batch", false);

        res.redirect("/Product");
      }
    })
    .catch((err) => {
      res.cookie("Batch", false);

      res.redirect("/Product");
    });
});

app.listen(8080, () => {
  console.log(`your application is live on 8080`);
});
