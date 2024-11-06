import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import type { S3Event } from "aws-lambda";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import "dotenv/config";

const client = new SQSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS1!,
    secretAccessKey: process.env.AWS2!,
  },
});

const ecsClient = new ECSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS1!,
    secretAccessKey: process.env.AWS2!,
  },
});

async function init() {
  const command = new ReceiveMessageCommand({
    QueueUrl:
      "https://sqs.us-east-1.amazonaws.com/992382566267/lux-transcoding-sqs",
    MaxNumberOfMessages: 1,
    // VisibilityTimeout: 20,
    WaitTimeSeconds: 10,
  });

  while (true) {
    const { Messages } = await client.send(command);
    if (!Messages) {
      console.log(`no Message in Queue`);
      continue;
    }

    try {
      for (const message of Messages) {
        const { MessageId, Body } = message;
        console.log(`Message Recieved`, { MessageId, Body });

        // valdate and parse the event
        if (!Body) continue;

        // ignore the test event
        const event = JSON.parse(Body) as S3Event;
        if ("Service" in event && "Event" in event) {
          if (event.Event === "s3:TestEvent") {
            await client.send(
              new DeleteMessageCommand({
                QueueUrl:
                  "https://sqs.us-east-1.amazonaws.com/992382566267/lux-transcoding-sqs",
                ReceiptHandle: message.ReceiptHandle,
              })
            );
            continue;
          }
        }

        // spin the docker container
        console.log("spin the docker container ");

        const eventRecord = event.Records[0];
        const bucket = eventRecord.s3.bucket.name;
        const key = eventRecord.s3.object.key;

        const runTaskCommand = new RunTaskCommand({
          taskDefinition: `arn:aws:ecs:us-east-1:992382566267:task-definition/video-transcoder`,
          cluster: `arn:aws:ecs:us-east-1:992382566267:cluster/dev`,
          launchType: "FARGATE",
          networkConfiguration: {
            awsvpcConfiguration: {
              assignPublicIp: "ENABLED",
              securityGroups: ["sg-02ec800c22ec5e285"],
              subnets: [
                "subnet-0c38b4e5bef23c479",
                "subnet-07ddf634355de09a4",
                "subnet-00d6d98bb48bdbf14",
              ],
            },
          },
          overrides: {
            containerOverrides: [
              {
                name: "video-transcoder",
                environment: [
                  { name: "BUCKET_NAME", value: bucket },
                  { name: "KEY", value: key },
                ],
              },
            ],
          },
        });
        await ecsClient.send(runTaskCommand);

        // delete the message from the queue
        console.log("deleted the message from the queue");

        await client.send(
          new DeleteMessageCommand({
            QueueUrl:
              "https://sqs.us-east-1.amazonaws.com/992382566267/lux-transcoding-sqs",
            ReceiptHandle: message.ReceiptHandle,
          })
        );
      }
    } catch (error) {
      console.error(error);
    }
  }
}

init();
