const jwt = require('jsonwebtoken');

const config = require('../config/env');
const model = require('../models/model');
const logger = require('../utils/logger');
// File upload services
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { uploadToS3 } = require('../config/s3upload');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    const thumbnailDir = path.join(__dirname, '../../uploads/thumbnails');
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.mkdir(thumbnailDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      console.log(error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const fileFilter = (req, file, cb) => {
  const modelExtensions = ['.glb', '.gltf', '.ply', '.xyz', '.pcd'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();
  const fieldName = file.fieldname;

  if (fieldName === 'file' && modelExtensions.includes(ext)) {
    return cb(null, true);
  }

  if (fieldName === 'thumbnail' && imageExtensions.includes(ext)) {
    return cb(null, true);
  }

  return cb(new Error('Invalid file type. Only GLB, GLTF, PLY, XYZ, PCD for models and JPG, PNG for thumbnails.'));
};


const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});
exports.uploadModel = async (req, res, next) => {
  try {
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err instanceof require('multer').MulterError) {
        logger?.error?.(err);
        return res.status(400).json({
          status: false,
          status_code: 400,
          message: `Multer error: ${err.message}`,
        });
      } else if (err) {
        logger?.error?.(err);
        return res.status(500).json({
          status: false,
          status_code: 500,
          message: 'Unexpected upload error',
        });
      }

      const glbFile = req.files?.file?.[0] || null;
      const thumbnailFile = req.files?.thumbnail?.[0] || null;
      const { customFilename } = req.body;
      const userId = req.user.id;

      if (!glbFile) {
        return res.status(400).json({
          status: false,
          status_code: 400,
          message: 'GLB model file is required',
        });
      }

      // Upload model to S3
      const glbFileUrl = await uploadToS3(
        glbFile.buffer,
        glbFile.originalname,
        glbFile.mimetype,
        'model' // will prefix with model- inside models/
      );

      // Upload thumbnail to S3 (optional)
      let thumbnailUrl = null;
      if (thumbnailFile) {
        thumbnailUrl = await uploadToS3(
          thumbnailFile.buffer,
          thumbnailFile.originalname,
          thumbnailFile.mimetype,
          'thumbnail' // will prefix with thumb- inside models/
        );
      }

      // Save to DB
      const fileData = {
        user_id: userId,
        filename: customFilename || glbFile.originalname,
        original_filename: glbFile.originalname,
        file_path: glbFileUrl,
        thumbnail_path: thumbnailUrl,
        file_type: path.extname(glbFile.originalname).toLowerCase(),
        file_size: glbFile.size,
      };

      const uploadedFile = await model.createFileUpload(fileData);

      return res.status(201).json({
        status: true,
        status_code: 201,
        message: 'File uploaded successfully',
        data: uploadedFile,
      });
    });
  } catch (error) {
    logger?.error?.(error) || console.log(error);
    next(error);
  }
};


exports.getModels = async (userId) => {
  try {
    const files = await model.getModelsByUserId(userId);
    return files;
  } catch (error) {
    throw error;
  }
};

exports.getModelById = async (fileId, userId) => {
  try {
    const file = await model.getModelById(fileId, userId);
    if (!file) {
      const error = new Error('File not found');
      error.statusCode = 404;
      throw error;
    }
    return file;
  } catch (error) {
    throw error;
  }
};

exports.deleteModel = async (id, userId) => {
  try {
    const file = await model.deleteModel(id, userId);
    if (!file) {
      const error = new Error('File not found');
      error.statusCode = 404;
      throw error;
    }

    // Delete physical files
    try {
      if (file.file_path) {
        await fs.unlink(path.join(__dirname, '../..', file.file_path));
      }
      if (file.thumbnail_path) {
        await fs.unlink(path.join(__dirname, '../..', file.thumbnail_path));
      }
    } catch (fileError) {
      console.error('Error deleting physical files:', fileError);
    }

    return file;
  } catch (error) {
    throw error;
  }
};

exports.updateModel = async (id, userId, data) => {
  try {
    
    const newmodel = await model.updateModel(id, userId, data);
    return newmodel;
  } catch (error) {
    throw error;
  }
};  

exports.getModelAnalytics = async (userId) => {
  try {
      const data = await model.getModelAnalytics(userId);
    
    return data;
  } catch (error) {
    throw error;
  }
};