import { promises as fs } from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

console.log("Starting video transcoding process...");

const originalFilePath = "/home/lux/Videos/out.mp4"; // Replace with the actual path

const RESOLUTIONS = [{ name: "720p", width: 1280, height: 720 }];

async function init() {
  console.log("Using local video file:", originalFilePath);

  // Ensure the 'transcoded' directory exists
  const transcodedDir = "transcoded";
  try {
    await fs.access(transcodedDir, fs.constants.F_OK);
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.mkdir(transcodedDir);
      console.log("Created transcoded directory");
    } else {
      throw err;
    }
  }

  // Start the transcoder and upload
  console.log("Starting video transcoding...");

  const promises = RESOLUTIONS.map((resolution) => {
    const output = `transcoded/video-${resolution.name}.mp4`;
    return new Promise((resolve) => {
      console.log(`Starting transcoding for ${resolution.name} resolution...`);

      ffmpeg(originalFilePath)
        .output(output)
        .withVideoCodec("libx264")
        .withAudioCodec("aac")
        .withSize(`${resolution.width}x${resolution.height}`)
        .on("end", async () => {
          console.log(
            `Transcoding completed for ${resolution.name} resolution.`
          );
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
  console.log("All transcoding tasks completed successfully.");
}

init().finally(() => process.exit(0));
