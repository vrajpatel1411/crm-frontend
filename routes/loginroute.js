const express=require("express");
const Router=express.Router();

const {logincontroller}=require('../controller/logincontroller');

Router.route('/login').post(logincontroller).get((req,res)=>{
   res.redirect('/'); 
});


module.exports=Router;
