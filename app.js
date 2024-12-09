const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("./models/user");
const postModel = require("./models/post");
const upload = require("./config/multerconfig")

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

app.get("/profile", isLoggenIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email }).populate("posts");
  res.render("profile", { user });
});

app.get("/profile/upload", (req, res) => {
  
  res.render("upload");
});

app.post("/upload", isLoggenIn, upload.single("image"), async (req, res) => {
  const user = await userModel.findOne({email: req.user.email})
  user.profilepic = req.file.filename
  await user.save()
  res.redirect("/profile")
});

app.get("/like/:id", isLoggenIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  if (post.likes.indexOf(req.user.userId)=== -1){
    post.likes.push(req.user.userId);
  }
  else{
    post.likes.splice(post.likes.indexOf(req.user.userId), 1);
  }
  console.log(post.likes)
  await post.save()
  res.redirect("/profile");
});

app.get("/edit/:id", isLoggenIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  
  res.render("edit", {post});
});

app.post("/update/:id", isLoggenIn, async (req, res) => {
  let post = await postModel.findOneAndUpdate({ _id: req.params.id }, {content: req.body.content});

  res.redirect("/profile");
});

app.post("/post", isLoggenIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;
  let post = await postModel.create({
    user: user._id,
    content,
  });
  user.posts.push(post._id);
  await user.save();

  res.redirect("/profile");
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
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
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.send("Email or password is incorrect");

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email, userId: user._id }, "shhhhhhh");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else return res.redirect("/login");
  });
});

function isLoggenIn(req, res, next) {
  if (req.cookies.token === "") res.redirect("/login");
  else {
    let data = jwt.verify(req.cookies.token, "shhhhhhh");
    req.user = data;
    next();
  }
}

app.listen(3000);
