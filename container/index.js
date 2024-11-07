const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
require("dotenv").config();

console.log("Starting video transcoding process...");

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS1,
    secretAccessKey: process.env.AWS2,
  },
});

const inputBucket = process.env.BUCKET_NAME;
const outputBucket = "lux-transcoding-output";
const inputKey = process.env.KEY;

const RESOLUTIONS = [{ name: "720p", width: 1280, height: 720 }];

async function init() {
  try {
    console.log("Downloading original video...");

    const command = new GetObjectCommand({
      Bucket: inputBucket,
      Key: inputKey,
    });

    const result = await s3Client.send(command);

    const originalFilePath = "original_video.mp4";
    await fs.promises.writeFile(originalFilePath, result.Body);
    console.log("Original video downloaded successfully.");

    // Start the transcoder and upload
    console.log("Starting video transcoding...");

    // Ensure the 'transcoded' directory exists
    const transcodedDir = "transcoded";
    try {
      await fs.promises.access(transcodedDir, fs.constants.F_OK);
    } catch (err) {
      if (err.code === "ENOENT") {
        await fs.promises.mkdir(transcodedDir);
        console.log("Created transcoded directory");
      } else {
        throw err;
      }
    }

    const promises = RESOLUTIONS.map((resolution) => {
      const outputFile = `transcoded/video-${resolution.name}.mp4`;
      const s3Key = `transcoded/video-${resolution.name}.mp4`;

      return new Promise((resolve) => {
        console.log(
          `Starting transcoding for ${resolution.name} resolution...`
        );

        ffmpeg(originalFilePath)
          .output(outputFile)
          .withVideoCodec("libx264")
          .withAudioCodec("aac")
          .withSize(`${resolution.width}x${resolution.height}`)
          .on("end", async () => {
            console.log(
              `Transcoding completed for ${resolution.name} resolution.`
            );

            try {
              const putCommand = new PutObjectCommand({
                Bucket: outputBucket,
                Key: s3Key,
                Body: fs.createReadStream(outputFile),
              });
              await s3Client.send(putCommand);
              console.log(`Uploaded ${resolution.name} resolution to S3`);
            } catch (error) {
              console.error(
                `Error uploading ${resolution.name} resolution to S3:`,
                error
              );
            }

            resolve();
          })
          .on("error", (err) => {
            console.error(
              `Error during transcoding for ${resolution.name}:`,
              err
            );
            resolve(); // Resolve the promise to avoid hanging
          })
          .run();
      });
    });

    await Promise.all(promises);
    console.log("All transcoding and upload tasks completed successfully.");

    // Clean up the downloaded video
    await fs.promises.unlink(originalFilePath);
    await fs.promises.rm("transcoded", { recursive: true, force: true });
    console.log("Deleted original video file");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

init().finally(() => process.exit(0));
