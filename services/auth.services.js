const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");

const mailService = require("./mail.services");
const db = require("../mongo");

const regBody = Joi.object({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginBody = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const changePasswordBody = Joi.object({
  password: Joi.string().min(6).required(),
  confirm_password: Joi.string().min(6).required(),
  userId: Joi.string().required(),
  token: Joi.string().required(),
});

const activateAccountBody = Joi.object({
  email: Joi.string().required(),
  token: Joi.string().required(),
});

const max_token_expiry_time=3600; //1 hr

const accountStatusValues = {
  Active: "Active",
  Pending: "Pending"
}

const service = {
  findByEmail(email) {
    return db.users.findOne({ email });
  },
  async findById(req, res) {
    let userId = req.userId;
    let user = await db.users.findOne({ _id: new ObjectId(userId) });
    if(!user)
      return res.send({ error: { message: "User not found" }});
    res.send(user);
  },
  async signUp(req, res) {
    let body = req.body;

    // Validate Request Body
    const { error } = await regBody.validate(req.body);
    if (error) return res.send({ error: { message: error.details[0].message }});

    // Check User Already Exists
    const data = await this.findByEmail(body.email);
    if (data) return res.send({ error: { message: "Email already exists" }});

    // Encrypt Password
    const salt = await bcrypt.genSalt(10);
    body.password = await bcrypt.hash(body.password, salt);

    //create account activation token
    let activationToken = crypto.randomBytes(32).toString("hex");
    const activationTokenHash = await bcrypt.hash(activationToken, salt);
    body.activationTokenHash = activationTokenHash;
    body.accountStatus = accountStatusValues.Pending;

    // Insert User to DB
    await db.users.insertOne({...body});

    //mail the activation link
    const activationLink = process.env.CLIENT_URL + '/login?token='+activationToken+'&email='+body.email;
    let mailHTMLbody = "<p>Hi</p>" 
      + "<p>Click on the following link to activate your account</p>"
      + "<a href="+activationLink+">Activate account</a>"
      + "<br/><br/>"
      + "<div>Regards</div>"
      + "<div>MyApp</div>"

    mailService.sendMail(body.email,"Account Activation", mailHTMLbody, activationLink);

    res.send({ success: { message: "Registered successfully" }});
  },
  async signIn(req, res) {
    // Validate Request Body
    const { error } = await loginBody.validate(req.body);
    if (error) return res.send({ error: { message: error.details[0].message }});

    // Check User Already Exists
    const data = await this.findByEmail(req.body.email);
    if (!data)
      return res.send({ error: { message: "User doesn't exist. Please signup" }});

    //check if account is activated
    if(data.accountStatus !== accountStatusValues.Active)
      return res.send({ error: { message: "Your account is not activated yet. Click on the verification link in your email to activate your account" }});

    // Check Password
    const valid = await bcrypt.compare(req.body.password, data.password);
    if (!valid) return res.send({ error: { message: "User credentials doesn't match" }});

    // Generate Token
    const token = await jwt.sign({ userId: data._id }, process.env.AUTH_SECRET);

    res.send({ success: { accessToken: token }});
  },
  async activateAccount(req, res) {
    // Validate Request Body
    const { error } = await activateAccountBody.validate(req.body);
    if (error) return res.send({ error: { message: error.details[0].message }});

    //fetch user
    let user = await db.users.findOne({ email: req.body.email });
    // console.log(user);
    if(!user)
      return res.send({error: {message: "User does not exist"}});
    
    //check if account is already approved
    if(user.accountStatus===accountStatusValues.Active)
      return res.send({success: {message: "Account is already activated"}});
    
    if(!user.activationTokenHash)
      return res.send({error: {message: "Token is invalid or expired"}});

    //check if token is valid
    const valid = await bcrypt.compare(req.body.token, user.activationTokenHash);

    if(!valid) {
      return res.send({error: {message: "Invalid Token"}});
    } 

    //update account status
    user.accountStatus = accountStatusValues.Active;
    user.activationTokenHash = null;
    // console.log(user);
    await db.users.updateOne({ _id: new ObjectId(user._id)}, { $set: { ...user } });
    
    res.send({success: {message: "Account Activated Successfully"}});
  },
  async resetPassword(req, res) {
    //verify email
    let email = req.params.email;
    let user = await this.findByEmail(email);
    // console.log(user);
    if(!user.email) return res.send({ error: { message: "Email does not exist" } });

    //delete token if token exists
    let token = await db.resetTokens.findOne({ userId: user._id });
    if (token) await db.resetTokens.deleteOne({ userId: user._id });

    //generate new token and its hash
    let resetToken = crypto.randomBytes(32).toString("hex");
    const salt = await bcrypt.genSalt(10);
    const resetTokenHash = await bcrypt.hash(resetToken, salt);
    console.log(Date.now)
    await db.resetTokens.insertOne({ userId: user._id, token: resetTokenHash, createdAt: Date.now()});

    //send mail
    const resetLink = process.env.CLIENT_URL + '/changePassword?token='+resetToken+'&id='+user._id;
    let mailHTMLbody = "<p>Hi</p>" 
      + "<p>Click on the following button to reset your password</p>"
      + "<a href="+resetLink+">Reset Password</a>"
      + "<br/><br/>"
      + "<div>Regards</div>"
      + "<div>MyApp</div>"

    mailService.sendMail(user.email,"Password Reset Request", mailHTMLbody, resetLink);

    res.send({success: {message: "Reset link sent to mail"}});
  },
  async changePassword(req, res) {
    // Validate Request Body
    const { error } = await changePasswordBody.validate(req.body);
    if (error) return res.send({ error: { message: error.details[0].message }});

    let user = await db.users.findOne({ _id: new ObjectId(req.body.userId) });
    if(!user)
      return res.send({error: {message: "User does not exist"}});
    
    let tokenDetails = await db.resetTokens.findOne({ userId: new ObjectId(req.body.userId) });
    if(!tokenDetails)
      return res.send({error: {message: "Token is invalid or expired"}});

    //check if token is valid
    const valid = await bcrypt.compare(req.body.token, tokenDetails.token);

    if(!valid) {
      return res.send({error: {message: "Invalid Token"}});
    } else {
      console.log(Date.now(), tokenDetails.createdAt, Date.now() < tokenDetails.createdAt + 3600)
      if(Date.now() < tokenDetails.createdAt + max_token_expiry_time)
        return res.send({error: {message: "Token expired"}});
    }

    //set new password
    const salt = await bcrypt.genSalt(10);
    let newPassword = await bcrypt.hash(req.body.password, salt);
    await db.users.updateOne({_id: new ObjectId(req.body.userId)}, { $set: { password: newPassword } });

    //delete the token
    await db.resetTokens.deleteOne({ userId: new ObjectId(user._id) });
    
    res.send({success: {message: "Password changed Successfully"}});

  },
  async validateAccessToken(req, res, next) {
    try {
      const token = req.headers["access-token"];
      // verify access token
      if (token) {
        let data = await jwt.verify(token, process.env.AUTH_SECRET);
        let userId = data.userId;
        let user = await db.users.findOne({ _id: new ObjectId(userId) });

        if(user.accountStatus===accountStatusValues.Active) {
          req.userId = userId;
          next();
        }
        else {
          res.send({ error: { message: "Your account is not activated yet. Click on the verification link in your email to activate your account" }});
        }
      } else {
        res.send({ error: { message: "Access Denied" }});
      }
    } catch (err) {
      res.send({ error: { message: "Access Denied" }});
    }
  },
};

module.exports = service;
