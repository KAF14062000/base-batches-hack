import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import multer from "multer";
import nodemailer from "nodemailer";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
// import { chat } from "./llm.js";
// import { writeFileSync } from "node:fs";
import { Ollama } from "ollama";
import { config } from "dotenv";
config();

const ollama = new Ollama({
  host: "https://ollama.com",
  headers: {
    Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`
  }
})

const prisma = new PrismaClient();
const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Helper: redacts large strings and sensitive keys
function safeReplacer(key, value) {
  const k = String(key || "").toLowerCase();
  const sensitive = ["password", "pass", "token", "authorization", "api_key", "image", "base64"];
  if (sensitive.includes(k)) return "[redacted]";
  if (typeof value === "string" && value.length > 200) return `[omitted ${value.length} chars]`;
  if (Buffer.isBuffer?.(value)) return `[buffer ${value.length} bytes]`;
  return value;
}

// Minimal request logging (method, path, status, duration)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    const baseMsg = `[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms}ms`;
    if (level === "info") return console.log(baseMsg);
    // On errors, include a compact, redacted snapshot of the request
    let bodySummary = "";
    try {
      const serialized = JSON.stringify(req.body ?? {}, safeReplacer);
      if (serialized && serialized !== "{}") bodySummary = ` body=${serialized}`;
    } catch {}
    const errMsg = res.locals?.error?.message ? ` error=${JSON.stringify(res.locals.error.message)}` : "";
    const line = `${baseMsg}${errMsg}${bodySummary}`;
    return level === "error" ? console.error(line) : console.warn(line);
  });
  next();
});

// (note) duplicate basic logger removed; enhanced logger above handles all cases

const promptsDir = path.resolve(process.cwd(), "src/prompts");
const promptCache = new Map();

async function loadPrompt(name) {
  if (!promptCache.has(name)) {
    const prompt = await fs.readFile(path.join(promptsDir, name), "utf8");
    promptCache.set(name, prompt);
  }
  return promptCache.get(name);
}

function parseChatResponse(payload) {
  if (!payload) return null;
  if (typeof payload === "object") {
    if (payload.message?.content) {
      try {
        return JSON.parse(payload.message.content);
      } catch (error) {
        console.warn("Failed to parse message content", error);
      }
    }
    if (payload.output || payload.result) {
      return payload.output ?? payload.result;
    }
  }

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }
  return payload;
}

function toDecimal(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (typeof value === "string" || typeof value === "number") {
    return new Prisma.Decimal(value);
  }
  throw new Error("Invalid decimal input");
}

function decimalToNumber(decimal) {
  return Number(
    decimal instanceof Prisma.Decimal ? decimal.toString() : decimal,
  );
}

function makeInviteCode() {
  return crypto.randomBytes(4).toString("hex");
}

async function ensureUser({ userId, email, name }) {
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
    return prisma.user.create({
      data: {
        id: userId,
        email,
        name,
      },
    });
  }

  if (email) {
    return prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
    });
  }

  return prisma.user.create({
    data: {
      name,
    },
  });
}

async function ensureGroup({ groupId, name, createdById, role = "member", walletAddress = null }) {
  let group = null;
  if (groupId) {
    group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      group = await prisma.group.create({
        data: {
          id: groupId,
          name: name ?? "Untitled Group",
          inviteCode: makeInviteCode(),
        },
      });
      console.log(`[api] ensureGroup: created group ${groupId}`);
    }
  } else {
    group = await prisma.group.create({
      data: {
        name: name ?? "Untitled Group",
        inviteCode: makeInviteCode(),
      },
    });
    console.log(`[api] ensureGroup: created group ${group.id}`);
  }

  if (createdById) {
    const user = await ensureUser({ userId: createdById });
    try {
      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId: user.id } },
        update: {},
        create: {
          groupId: group.id,
          userId: user.id,
          role,
          walletAddress,
        },
      });
    } catch (e) {
      // ignore membership race conditions
    }
  }

  return group;
}

async function buildUserAllocations({ userId, from, to }) {
  const where = {
    member: { userId },
  };
  if (from || to) {
    where.item = {
      expense: {
        date: {},
      },
    };
    if (from) {
      where.item.expense.date.gte = from;
    }
    if (to) {
      where.item.expense.date.lte = to;
    }
  }

  const allocations = await prisma.allocation.findMany({
    where,
    include: {
      item: {
        include: {
          expense: true,
        },
      },
    },
  });

  const totalsByMonth = new Map();
  const totalsByCategory = new Map();
  let total = new Prisma.Decimal(0);

  allocations.forEach((allocation) => {
    const amount = toDecimal(allocation.amount);
    total = total.add(amount);

    const expenseDate = allocation.item.expense.date;
    const monthKey = `${expenseDate.getUTCFullYear()}-${String(
      expenseDate.getUTCMonth() + 1,
    ).padStart(2, "0")}`;

    totalsByMonth.set(
      monthKey,
      toDecimal(totalsByMonth.get(monthKey) ?? 0).add(amount),
    );

    const category = allocation.item.category ?? "other";
    totalsByCategory.set(
      category,
      toDecimal(totalsByCategory.get(category) ?? 0).add(amount),
    );
  });

  return {
    totalsByMonth: Array.from(totalsByMonth.entries()).map(
      ([month, value]) => ({
        month,
        total: decimalToNumber(value),
      }),
    ),
    totalsByCategory: Array.from(totalsByCategory.entries()).map(
      ([category, value]) => ({
        category,
        total: decimalToNumber(value),
      }),
    ),
    totalSpent: decimalToNumber(total),
  };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/ocr", upload.single("file"), async (req, res, next) => {
  try {
    const base64Image =
      req.file?.buffer?.toString("base64") ||
      req.body.image ||
      req.body.base64 ||
      null;

    if (!base64Image) {
      return res
        .status(400)
        .json({ error: "image file or base64 is required" });
    }

    const prompt = await loadPrompt("ocr.md");
    const schema = {
      type: "object",
      properties: {
        merchant: { type: "string" },
        date: { type: "string" },
        currency: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              qty: { type: "number" },
              price: { type: "number" },
              category: { type: "string" },
            },
            required: ["name", "qty", "price", "category"],
            additionalProperties: false,
          },
        },
        subtotal: { type: "number" },
        tax: { type: "number" },
        total: { type: "number" },
      },
      required: [
        "merchant",
        "date",
        "currency",
        "items",
        "subtotal",
        "tax",
        "total",
      ],
      additionalProperties: false,
    };

    const messages = [
      { role: "system", content: prompt },
      {
        role: "user",
        content:
          "Please extract the merchant, date, totals, and line items from this receipt. Return valid JSON that matches the schema.",
        images: [base64Image],
      },
    ];

    const response = await ollama.chat({
      model: "qwen3-vl:235b",
      messages: messages, 
      stream: false,
    });
    const parsed = parseChatResponse(response);
    res.json(parsed);
  } catch (error) {
    next(error);
  }
});

const expenseSchema = z.object({
  groupId: z.string(),
  createdById: z.string().optional(),
  splitId: z.string().optional(),
  merchant: z.string().min(1),
  date: z
    .string()
    .min(1)
    .transform((value) => new Date(value)),
  currency: z.string().min(1),
  subtotal: z.coerce.number(),
  tax: z.coerce.number(),
  total: z.coerce.number(),
  items: z
    .array(
      z.object({
        name: z.string(),
        qty: z.coerce.number().int().min(1),
        price: z.coerce.number(),
        category: z.string().min(1),
      }),
    )
    .min(1),
});

app.post("/expenses", async (req, res, next) => {
  try {
    const payload = expenseSchema.parse(req.body);

    // Ensure the group (and creator membership) exists; create if missing
    await ensureGroup({
      groupId: payload.groupId,
      name: "Untitled Group",
      createdById: payload.createdById,
    });

    const created = await prisma.expense.create({
      data: {
        groupId: payload.groupId,
        createdById: payload.createdById ?? null,
        splitId: payload.splitId ?? null,
        merchant: payload.merchant,
        date: payload.date,
        currency: payload.currency,
        subtotal: toDecimal(payload.subtotal),
        tax: toDecimal(payload.tax),
        total: toDecimal(payload.total),
        items: {
          create: payload.items.map((item) => ({
            name: item.name,
            quantity: item.qty,
            price: toDecimal(item.price),
            category: item.category,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.get("/expenses/:id", async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        items: {
          include: {
            allocations: true,
          },
        },
      },
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json(expense);
  } catch (error) {
    next(error);
  }
});

const expenseUpdateSchema = z.object({
  splitId: z.string().optional(),
});

app.patch("/expenses/:id", async (req, res, next) => {
  try {
    const payload = expenseUpdateSchema.parse(req.body ?? {});
    const updated = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        splitId: payload.splitId ?? null,
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        items: {
          include: {
            allocations: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ error: "Expense not found" });
    }
    next(error);
  }
});

const groupSchema = z.object({
  name: z.string().min(1),
  members: z
    .array(
      z.object({
        userId: z.string().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        role: z.string().optional(),
        walletAddress: z.string().optional(),
      }),
    )
    .optional(),
});

app.post("/groups", async (req, res, next) => {
  try {
    const payload = groupSchema.parse(req.body);
    const inviteCode = makeInviteCode();

    const group = await prisma.group.create({
      data: {
        name: payload.name,
        inviteCode,
      },
    });

    if (payload.members?.length) {
      await Promise.all(
        payload.members.map(async (member) => {
          const user = await ensureUser(member);
          await prisma.groupMember.create({
            data: {
              groupId: group.id,
              userId: user.id,
              role: member.role ?? "member",
              walletAddress: member.walletAddress ?? null,
            },
          });
        }),
      );
    }

    const withMembers = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    res.status(201).json(withMembers);
  } catch (error) {
    next(error);
  }
});

app.get("/groups/:id", async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        expenses: {
          orderBy: { date: "desc" },
          include: {
            items: {
              include: {
                allocations: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.json(group);
  } catch (error) {
    next(error);
  }
});

const inviteSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
});

app.post("/groups/:id/invite", async (req, res, next) => {
  try {
    const payload = inviteSchema.parse(req.body ?? {});
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
    const link = `${baseUrl}/group/${group.id}?invite=${group.inviteCode}`;

    const hasSmtp =
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (hasSmtp && payload.email) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: payload.email,
        subject: `You're invited to ${group.name}`,
        text: `${payload.name ? `${payload.name}, ` : ""}join the group at ${link}`,
        html: `<p>${payload.name ? `${payload.name}, ` : ""}join the group at <a href="${link}">${link}</a></p>`,
      });
    }

    res.json({ link });
  } catch (error) {
    next(error);
  }
});

const allocationSchema = z.object({
  allocations: z
    .array(
      z.object({
        itemId: z.string(),
        memberIds: z.array(z.string()).min(1),
      }),
    )
    .min(1),
});

app.post("/expenses/:id/allocate", async (req, res, next) => {
  try {
    const payload = allocationSchema.parse(req.body);
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
      },
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    await prisma.$transaction(
      payload.allocations.map((allocation) => async (tx) => {
        const item = expense.items.find((i) => i.id === allocation.itemId);
        if (!item) {
          throw new Error(`Invalid item ${allocation.itemId}`);
        }
        const price = toDecimal(item.price);
        const share = price.div(allocation.memberIds.length);

        await tx.allocation.deleteMany({
          where: { itemId: allocation.itemId },
        });

        await tx.allocation.createMany({
          data: allocation.memberIds.map((memberId) => ({
            itemId: allocation.itemId,
            memberId,
            amount: share,
          })),
        });
      }),
    );

    const updated = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        items: {
          include: {
            allocations: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.get("/users/:id/dashboard", async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const range = {
      from: from ? new Date(String(from)) : undefined,
      to: to ? new Date(String(to)) : undefined,
    };

    const aggregate = await buildUserAllocations({
      userId: req.params.id,
      ...range,
    });

    res.json(aggregate);
  } catch (error) {
    next(error);
  }
});

app.get("/users/:id/insights", async (req, res, next) => {
  try {
    const now = new Date();
    const currentFrom = new Date(now);
    currentFrom.setDate(now.getDate() - 30);
    const previousFrom = new Date(currentFrom);
    previousFrom.setDate(currentFrom.getDate() - 30);

    const [current, previous] = await Promise.all([
      buildUserAllocations({
        userId: req.params.id,
        from: currentFrom,
        to: now,
      }),
      buildUserAllocations({
        userId: req.params.id,
        from: previousFrom,
        to: currentFrom,
      }),
    ]);

    const prompt = await loadPrompt("insights.md");
    const schema = {
      type: "object",
      properties: {
        summary: { type: "string" },
        tips: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 3,
        },
      },
      required: ["summary", "tips"],
      additionalProperties: false,
    };

    const messages = [
      { role: "system", content: prompt },
      {
        role: "user",
        content: JSON.stringify(
          {
            last30Days: current,
            previous30Days: previous,
          },
          null,
          2,
        ),
      },
    ];

    const response = await ollama.chat({ 
      model: "qwen3-vl:235b",
      messages: messages,
      stream: false,
    });

    const parsed = parseChatResponse(response);
    res.json({
      comparison: {
        last30Days: current,
        previous30Days: previous,
      },
      insights: parsed,
    });
  } catch (error) {
    next(error);
  }
});

const deals = [
  {
    id: "deal-food-1",
    title: "20% off Groceries",
    category: "food",
    description: "Save on weekly groceries at partnered supermarkets.",
    link: "https://example.com/deals/groceries",
  },
  {
    id: "deal-drinks-1",
    title: "2-for-1 Coffee Tuesdays",
    category: "drinks",
    description: "Get a free coffee with any purchase every Tuesday.",
    link: "https://example.com/deals/coffee",
  },
  {
    id: "deal-transport-1",
    title: "Discounted Ride Passes",
    category: "transport",
    description: "10% off ride-share passes for daily commuters.",
    link: "https://example.com/deals/ride",
  },
  {
    id: "deal-entertainment-1",
    title: "Movie Night Bundle",
    category: "entertainment",
    description: "Buy two movie tickets and get free popcorn.",
    link: "https://example.com/deals/movies",
  },
  {
    id: "deal-utilities-1",
    title: "Smart Home Energy Saver",
    category: "utilities",
    description: "15% off smart plugs and thermostats.",
    link: "https://example.com/deals/energy",
  },
  {
    id: "deal-other-1",
    title: "Local Experiences",
    category: "other",
    description: "25% off local tours and experiences.",
    link: "https://example.com/deals/local",
  },
];

app.get("/deals", (req, res) => {
  const categories = String(req.query.categories || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!categories.length) {
    return res.json(deals.slice(0, 8));
  }

  const filtered = deals.filter((deal) => categories.includes(deal.category));
  res.json(filtered.length ? filtered : deals.slice(0, 8));
});

// JSON 404 for unknown routes (helps clients surface clear errors)
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  // Attach to res for the finish-logger above
  res.locals.error = err;
  // Structured error log with redacted request summary
  let body = "";
  try {
    const serialized = JSON.stringify(req.body ?? {}, safeReplacer);
    if (serialized && serialized !== "{}") body = ` body=${serialized}`;
  } catch {}
  const line = `[api] ERROR ${req.method} ${req.originalUrl} -> ${status} message=${JSON.stringify(
    err.message || ""
  )}${body}`;
  console.error(line);
  if (err.stack) console.error(err.stack);
  res.status(status).json({ error: err.message || "Unexpected server error" });
});

const port = Number(process.env.PORT || 4000);

app
  .listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  })
  .on("error", (err) => {
    console.error("Failed to start server", err);
  });
