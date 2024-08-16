import express from "express";
import { PrismaClient } from "@repo/db";

const client = new PrismaClient();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/hooks/catch/:userId/:zapId", async (req, res) => {
  const userId = req.params.userId;
  const zapId = req.params.zapId;
  const data = req.body;

  try {
    await client.$transaction(async (tx) => {
      const run = await tx.zapRun.create({
        data: {
          zapId: zapId,
          status: "PENDING",
          metadata: data,
        },
      });

      await tx.zapRunOutBox.create({
        data: {
          zapRunId: run.id,
          status: "PENDING",
        },
      });
    });

    res.send("OK");
  } catch (error) {
    console.error("Transaction failed:", error);
    res.status(500).send("An error occurred while processing the request.");
  }
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
