import Docker from "dockerode";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import type { S3Event } from "aws-lambda";
import "dotenv/config";

const sqsClient = new SQSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS1!,
    secretAccessKey: process.env.AWS2!,
  },
});
const docker = new Docker(); // Default will connect to the Docker daemon on the same machine

async function init() {
  const command = new ReceiveMessageCommand({
    QueueUrl:
      "https://sqs.us-east-1.amazonaws.com/992382566267/lux-transcoding-sqs",
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 10,
  });

  while (true) {
    const { Messages } = await sqsClient.send(command);
    if (!Messages) {
      console.log(`No messages in queue`);
      continue;
    }

    try {
      for (const message of Messages) {
        const { MessageId, Body } = message;
        console.log(`Message received`, { MessageId, Body });

        if (!Body) continue;
        const event = JSON.parse(Body) as S3Event;

        // Skip S3 test events
        if (event.Event === "s3:TestEvent") {
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl:
                "https://sqs.us-east-1.amazonaws.com/992382566267/lux-transcoding-sqs",
              ReceiptHandle: message.ReceiptHandle,
            })
          );
          continue;
        }

        const eventRecord = event.Records[0];
        const bucket = eventRecord.s3.bucket.name;
        const key = eventRecord.s3.object.key;

        // Start a Docker container for transcoding
        console.log("Starting Docker container for transcoding");

        const container = await docker.createContainer({
          Image: "unlux/transcoding", // Replace with your Docker image
          Env: [`BUCKET_NAME=${bucket}`, `KEY=${key}`],
          HostConfig: {
            NetworkMode: "host", // Adjust as needed
          },
        });

        await container.start();
        console.log("Docker container started");

        // Delete message from SQS
        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl:
              "https://sqs.us-east-1.amazonaws.com/992382566267/lux-transcoding-sqs",
            ReceiptHandle: message.ReceiptHandle,
          })
        );
        console.log("Deleted the message from the queue");
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }
}

init();
