
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import errorHandler from "./middleware/error.handler.js";
import authRouter from "./routes/auth.route.js";
import paymentsRouter, { webhookRouter } from "./routes/payment.route.js";

dotenv.config();

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use("/v1/payments", webhookRouter);
app.use(express.json());
app.use("/v1/auth", authRouter);
app.use("/v1/payments", paymentsRouter);
app.use(errorHandler);

const PORT = process.env.APP_PORT || 3000;
if (process.env.APP_ENV === "development") {
  app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
  });
} else {
  app.listen(PORT);
}
