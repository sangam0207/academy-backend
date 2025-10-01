import dotenv from "dotenv";
dotenv.config();

const ENV = {
  APP_ENV: process.env.APP_ENV,
  APP_PORT: process.env.APP_PORT,
  JWT_SECRET: process.env.JWT_SECRET,
 
};

export { ENV };
