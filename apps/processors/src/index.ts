import { PrismaClient } from "@repo/db";
import { Kafka } from "kafkajs";

const TOPIC_NAME = "zap-events";
const client = new PrismaClient();

const kafka = new Kafka({
  clientId: "outbox-processor",
  brokers: ["localhost:9092"],
});

async function main() {
  const producer = kafka.producer();
  await producer.connect();
  while (true) {
    const pendingRows = await client.zapRunOutBox.findMany({
      where: {
        status: "PENDING",
      },
      take: 10,
    });

    producer.send({
      topic: TOPIC_NAME,
      messages: pendingRows.map((row) => {
        return {
          value: row.zapRunId,
        };
      }),
    });

    await client.$transaction(async (tx) => {
      await tx.zapRun.updateMany({
        where: {
          id: {
            in: pendingRows.map((row) => row.id),
          },
        },
        data: {
          status: "PROCESSING",
        },
      });

      await tx.zapRunOutBox.deleteMany({
        where: {
          id: {
            in: pendingRows.map((row) => row.id),
          },
        },
      });
    });
  }
}

main();
