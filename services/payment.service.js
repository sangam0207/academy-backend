import Razorpay from "razorpay";
import crypto from "crypto";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rz = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---- Updated Pricing (paise)
const PRICE_TABLE = {
  BASIC: { amount: 199 * 100, label: "Webinar Access" },
  CHALLENGE: { amount: 299 * 100, label: "Webinar + AI Challenge" },
  INTERNSHIP: { amount: 499 * 100, label: "Webinar + Internship" },
};

function assertEnv() {
  const needed = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
  ];
  const missing = needed.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

function buildReceipt(plan, userId) {
  return `rcpt_${plan}_${Date.now()}_${userId.slice(0, 6)}`;
}

function priceFor(plan) {
  const p = PRICE_TABLE[plan];
  if (!p) throw new Error("Invalid plan");
  return p;
}

export async function hasPurchased(userId) {
  const purchase = await prisma.purchase.findUnique({ where: { userId } });
  return !!purchase;
}

export async function createOrder({ userId, plan }) {
  assertEnv();

  if (!userId) throw new Error("Invalid details");
  if (!plan || !(plan in PRICE_TABLE)) throw new Error("Invalid plan");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const alreadyBought = await hasPurchased(userId);
  if (alreadyBought) {
    throw new Error("You've already bought a plan with this account.");
  }

  const recentUnpaid = await prisma.order.findFirst({
    where: { userId, status: "CREATED" },
    orderBy: { createdAt: "desc" },
  });
  if (recentUnpaid) {
    const price = priceFor(plan);
    return {
      key: process.env.RAZORPAY_KEY_ID,
      orderId: recentUnpaid.razorpayOrderId,
      amount: price.amount,
      currency: "INR",
      name: price.label,
      description: price.label,
      prefill: { name: user.name, email: user.email, contact: user.mobile },
    };
  }

  const price = priceFor(plan);
  const receipt = buildReceipt(plan, userId);

  const rOrder = await rz.orders.create({
    amount: price.amount,
    currency: "INR",
    receipt,
    notes: { userId, plan },
  });

  await prisma.order.create({
    data: {
      userId,
      plan,
      amount: price.amount,
      currency: "INR",
      receipt,
      razorpayOrderId: rOrder.id,
      status: "CREATED",
      notes: {
        label: price.label,
        email: user.email,
        mobile: user.mobile,
      },
    },
  });

  return {
    key: process.env.RAZORPAY_KEY_ID,
    orderId: rOrder.id,
    amount: price.amount,
    currency: "INR",
    name: price.label,
    description: price.label,
    prefill: { name: user.name, email: user.email, contact: user.mobile },
  };
}

export async function verifySignature({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  assertEnv();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new Error("Missing payment verification fields");
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const isValid = expected === razorpay_signature;
  const order = await prisma.order.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
  });
  if (!order) throw new Error("Order not found");

  if (order.status === "PAID") {
    return { ok: true };
  }

  await prisma.order.update({
    where: { razorpayOrderId: razorpay_order_id },
    data: {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: isValid ? "PAID" : "FAILED",
    },
  });

  if (!isValid) return { ok: false };
  const expectedPrice = priceFor(order.plan);
  if (order.amount !== expectedPrice.amount || order.currency !== "INR") {
    throw new Error("Order amount/currency mismatch");
  }

  try {
    await prisma.purchase.create({
      data: { userId: order.userId, plan: order.plan },
    });
  } catch (err) {
    if (
      !(
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      )
    ) {
      throw err;
    }
  }

  return { ok: true };
}

export async function handleWebhook(rawBodyString, signatureHeader) {
  assertEnv();

  if (!signatureHeader) throw new Error("Missing webhook signature header");

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBodyString)
    .digest("hex");

  if (expected !== signatureHeader) {
    throw new Error("Invalid webhook signature");
  }

  const evt = JSON.parse(rawBodyString);

  switch (evt.event) {
    case "payment.captured":
    case "payment.failed": {
      const payment = evt.payload.payment?.entity;
      if (!payment?.order_id) break;

      const order = await prisma.order.update({
        where: { razorpayOrderId: payment.order_id },
        data: {
          status: evt.event === "payment.captured" ? "PAID" : "FAILED",
          razorpayPaymentId: payment.id ?? null,
        },
      });

      if (evt.event === "payment.captured") {
        const expectedPrice = priceFor(order.plan);
        if (order.amount !== expectedPrice.amount || order.currency !== "INR") {
          break;
        }

        try {
          await prisma.purchase.create({
            data: { userId: order.userId, plan: order.plan },
          });
        } catch (err) {
          if (
            !(
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P2002"
            )
          ) {
            throw err;
          }
        }
      }
      break;
    }

    case "order.paid": {
      const orderEnt = evt.payload.order?.entity;
      if (!orderEnt?.id) break;

      const order = await prisma.order.update({
        where: { razorpayOrderId: orderEnt.id },
        data: { status: "PAID" },
      });

      const expectedPrice = priceFor(order.plan);
      if (order.amount !== expectedPrice.amount || order.currency !== "INR") {
        break;
      }

      try {
        await prisma.purchase.create({
          data: { userId: order.userId, plan: order.plan },
        });
      } catch (err) {
        if (
          !(
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          )
        ) {
          throw err;
        }
      }
      break;
    }

    default:
      break;
  }

  return { ok: true };
}