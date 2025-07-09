const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { log } = require('winston');

// Create S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadToS3 = async (fileBuffer, originalName, mimeType, type = 'model') => {
  const prefix = type === 'thumbnail' ? 'thumb-' : 'model-';
  const fileKey = `models/${prefix}${uuidv4()}${path.extname(originalName)}`;
  console.log("Uploading to S3:", fileKey);

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read',
  };

  const command = new PutObjectCommand(uploadParams);
  await s3.send(command);

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
};


module.exports = { uploadToS3, upload };
