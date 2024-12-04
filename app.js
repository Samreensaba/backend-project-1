const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("./models/user");
const postModel = require("./models/post");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/profile", isLoggenIn, (req, res) => {
  res.send("Hi");
});

app.get("/logout", (req, res) => {
  res.cookie("token", "")
  res.redirect("/login")
});

app.post("/register", async (req, res) => {
  let { username, name, email, age, password } = req.body;
  let user = await userModel.findOne({ email });
  if (user) return res.status(500).send("User already registered");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      console.log(hash);
      let user = await userModel.create({
        username,
        name,
        age,
        email,
        password: hash,
      });
      let token = jwt.sign({ email, userId: user._id }, "shhhhhhh");
      res.cookie("token", token);
    });
  });
});

app.post("/login", async (req, res) => {
  let {email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.send("Email or password is incorrect");

  bcrypt.compare(password, user.password, (err, result)=>{
    if (result) { 
      let token = jwt.sign({ email, userId: user._id }, "shhhhhhh");
      res.cookie("token", token);
      res.status(200).send("You are logged in");
    }
    else return res.redirect("/login");
    
  })
});

function isLoggenIn(req, res, next){
  if(req.cookies.token === "") res.redirect("/login") 
    next()
  let data = jwt.verify(req.cookies.token, "shhhhhhh");
  req.user = data
}

app.listen(3000);
