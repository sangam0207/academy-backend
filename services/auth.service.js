// src/services/auth.service.js
import ErrorResponse from "../lib/error.res.js";
import jwt from "jsonwebtoken";
import { ENV } from "../configs/constant.js";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma=new PrismaClient()
class AuthService {
  #normalize(input) {
    const name = String(input?.name ?? "").trim();
    const email = String(input?.email ?? "").trim().toLowerCase();
    const mobile = String(input?.mobile ?? "").trim();
    return { name, email, mobile };
  }

  async register(payload) {
    const { name, email, mobile } = this.#normalize(payload);
     console.log(name,email,mobile)
    if (!name) throw ErrorResponse.badRequest("Name is required");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw ErrorResponse.badRequest("Valid email is required");
    if (!mobile) throw ErrorResponse.badRequest("Mobile is required");

    // 1) Look up existing user
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id:true,email: true, name: true, mobile: true },
    });

    let user = existing;

    // 2) If not found, create; otherwise reuse existing
    if (!existing) {
      user = await prisma.user.create({
        data: { name, email, mobile },
      });
    }

    // 3) Sign a fresh JWT for either case
    const token = jwt.sign(
      { id: user.id, email: user.email },
      ENV.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return { user, token, isNew: !existing };
  }
}

export default new AuthService();
