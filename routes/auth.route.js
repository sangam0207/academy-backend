import express from "express";
import { signup } from "../controllers/auth.controller.js";
import { verifyAuth } from "../middleware/verifyauth.js";
const router = express.Router();
router.get('/test',(req,res)=>{
res.json({mesage:"testing"})
})

router.post('/register',signup)
export default router;
