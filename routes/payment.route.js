
import express from "express";
import {
  createOrder,
  verifySignature,
  handleWebhook,
} from "../services/payment.service.js";
import { ENV } from "../configs/constant.js";
import jwt from "jsonwebtoken"
const router = express.Router();

// Create order
router.post("/create-order",async (req, res) => {
  try {
    const {plan,token} = req.body; 
      let decoded
      try {
        decoded= jwt.verify(token, ENV.JWT_SECRET);
      } catch (error) {
         return res.status(401).json({error:"Invalid User details"})
      }
     
      console.log(decoded)
      let userId=decoded.id;
      const payload = await createOrder({ userId, plan });
      res.json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Verify payment after checkout
router.post("/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const result = await verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

    if (result.ok) {
      return res.json({ success: true, redirect: process.env.FRONTEND_SUCCESS_URL || "/" });
    }
    return res.status(400).json({ success: false, redirect: process.env.FRONTEND_FAILURE_URL || "/" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


export const webhookRouter = express.Router();
webhookRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const rawBodyString = req.body.toString("utf8");
      const sig = req.headers["x-razorpay-signature"];
      await handleWebhook(rawBodyString, sig);
      res.status(200).send("ok");
    } catch {
      res.status(400).send("bad signature");
    }
  }
);

export default router;
