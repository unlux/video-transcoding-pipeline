
# Video Transcoding Pipeline

A highly efficient and cost-effective video transcoding pipeline leveraging AWS services. This repository simplifies the video transcoding workflow by running containers directly on the same EC2 instance as the code, avoiding ECS costs. The pipeline is designed to handle video transcoding tasks using AWS SQS for communication and scheduling.

## Features

- **AWS SQS Integration**: Easily manage message queues for video transcoding tasks.
- **Efficient Resource Usage**: Containers are spawned directly on the EC2 instance, reducing costs by avoiding ECS.
- **Customizable**: Adapt the pipeline to fit your transcoding needs and system requirements.

## Prerequisites

- AWS account with the following configured:
  - SQS Queue
  - EC2 instance
  - S3 buckets
- Docker installed on your EC2 instance

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/unlux/video-transcoding-pipeline.git
   cd video-transcoding-pipeline
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up your AWS credentials and configuration:

   - Add your AWS access key, secret key, and region to the environment variables as needed.

4. Configure the pipeline settings in the provided configuration file (e.g., `config.json` or `.env`).

## Usage

1. Start the consumer:


2. Send a video transcoding input bucket, it will generate anSQS queue. The message should be like:

   ```json
   {
     "input": "s3://your-bucket/input-video.mp4",
     "output": "s3://your-bucket/output-video.mp4",
     "settings": {
       "resolution": "1080p",
       "codec": "h264",
       "bitrate": "4000k"
     }
   }
   ```

3. check the output bucket:


## Configuration

- **SQS Queue**: Update the SQS queue URL in the configuration file.
- **Docker Settings**: Ensure Docker is configured to run the required containers.

## Directory Structure
```
video-transcoding-pipeline
├── bun.lockb
├── container
│   ├── Dockerfile
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
├── package.json
├── package-lock.json
├── README.md
├── src
│   ├── docker.ts
│   └── index.ts
└── tsconfig.json
```

## Acknowledgments

- [AWS SQS](https://aws.amazon.com/sqs/) for reliable message queuing.
- [Docker](https://www.docker.com/) for containerized transcoding.
- [NixOS](https://nixos.org/) for its reproducible development environment.
