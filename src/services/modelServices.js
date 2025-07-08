const jwt = require('jsonwebtoken');

const config = require('../config/env');
const model = require('../models/model');
const logger = require('../utils/logger');
// File upload services
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { uploadToS3 } = require('../config/s3upload');
const storage = multer.memoryStorage();

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
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});
exports.uploadModel = async (req, res, next) => {
  try {
 userId=req.user.id
      console.log(userId);
  
      const activeSub = await model.getActiveSubPlanforUserId(userId);
      if (!activeSub) {
        throw new Error("No active subscription found");
      }
  
      const plan_id = activeSub.plan_id;
      console.log(plan_id);
  
      const planDetails = await model.getMonthlyQuotaforSubId(plan_id);
      const uploadQuota = planDetails.uploads;
  
      const usage = await model.getModelAnalyticsForMonth(userId);
      
      const currentUploadUsage = usage?.uploads_this_month || 0;
  
      
      const projectedTotal = parseInt(currentUploadUsage)+1;
      console.log(`projectedTotal ${projectedTotal} ${uploadQuota}`);
      
      if (projectedTotal > uploadQuota) {
        const error = new Error(
          `Detection quota exceeded. Quota: ${uploadQuota}, Used: ${currentUploadUsage}, Attempted: 1`
        );
        error.statusCode = 403; 
        throw error;
      }
  







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
      const glbMimeType = path.extname(glbFile.originalname).toLowerCase() === '.glb'
      ? 'model/gltf-binary'
      : glbFile.mimetype;
    
      // Upload model to S3
      const glbFileUrl = await uploadToS3(
        glbFile.buffer,
        glbFile.originalname,
        glbMimeType,
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
    console.log(userId);

    const activeSub = await model.getActiveSubPlanforUserId(userId);
    if (!activeSub) {
      throw new Error("No active subscription found");
    }

    const plan_id = activeSub.plan_id;
    console.log(plan_id);

    const planDetails = await model.getMonthlyQuotaforSubId(plan_id);
    const detectionQuota = planDetails.detections;

    const usage = await model.getModelAnalyticsForMonth(userId);
    
    const currentDetectionUsage = usage?.detections_this_month || 0;

    const newDetectionValue = parseInt(data.detection);
    const projectedTotal = parseInt(currentDetectionUsage)+ parseInt(newDetectionValue);
    console.log(`projectedTotal ${projectedTotal} ${detectionQuota}`);
    
    if (projectedTotal > detectionQuota) {
      const error = new Error(
        `Detection quota exceeded. Quota: ${detectionQuota}, Used: ${currentDetectionUsage}, Attempted: ${newDetectionValue}`
      );
      error.statusCode = 403; 
      throw error;
    }




    const newmodel = await model.updateModel(id, data);
    return newmodel;
  } catch (error) {
    throw error;
  }
};  

exports.getModelAnalytics = async (userId) => {

const plan=await model.getActiveSubPlanforUserId(userId)
const plan_id=plan.plan_id
console.log(plan_id);

const plan_details=await model.getMonthlyQuotaforSubId(plan_id)
console.log(plan_details);

  try {
      const data = await model.getModelAnalyticsForMonth(userId);
    detection_balance=plan_details.detections-data.detections_this_month
    return {
      monthly_quota_uploads:plan_details.uploads,
      monthly_quota_detections:plan_details.detections,
      total_models:data.total_models,
        total_detections: data.total_detections,
        detections_this_month: data.detections_this_month,
        uploads_this_month:data.uploads_this_month,
        detection_balance:detection_balance
    };
  } catch (error) {
    throw error;
  }
};