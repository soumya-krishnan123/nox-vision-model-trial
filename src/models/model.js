const db = require('../config/db');


// File upload related operations
exports.createFileUpload = async (fileData) => {
  const { 
    user_id, 
    filename,        // model_name
    file_path,       // model_path
    thumbnail_path, 
    file_type, 
    file_size,
    detection = null
  } = fileData;
  const model_date = new Date();
  const query = `
    INSERT INTO models (
      user_id,
      model_name,
      model_path,
      thumbnail_path,
      file_type,
      file_size,
      detection,
      model_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING 
      id, user_id, model_name, model_path, thumbnail_path, 
      file_type, file_size, detection, 
      created_at, updated_at
  `;

  const values = [
    user_id,
    filename,
    file_path,
    thumbnail_path,
    file_type,
    file_size,
    detection,
    model_date
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
};


exports.getModelsByUserId = async (userId) => {
  const query = `
    SELECT id, model_name, model_path, thumbnail_path, file_type, file_size, created_at
    FROM models
    WHERE user_id = $1 and status = true
    ORDER BY created_at DESC
  `;
  
  const { rows } = await db.query(query, [userId]);
  return rows;
};

exports.getModelById = async (modelId, userId) => {
  const query = `
    SELECT id, model_name, model_path, thumbnail_path, file_type, file_size, created_at
    FROM models
    WHERE id = $1 AND user_id = $2
  `;
  
  const { rows } = await db.query(query, [modelId, userId]);
  return rows[0];
};

exports.deleteModel = async (id, userId) => {
  const query = `
    UPDATE models
    SET status = false, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, model_name, model_path, status
  `;
  
  const { rows } = await db.query(query, [id, userId]);
  return rows[0];
};


exports.updateModel = async (id, data) => {
  if (data.model_id) {
    // Check for duplicate model_id owned by the same user but different id
    const duplicateCheckQuery = `
      SELECT id FROM models 
      WHERE model_id = $1  AND id != $2
      LIMIT 1
    `;
    const { rows } = await db.query(duplicateCheckQuery, [data.model_id, id]);
    if (rows.length > 0) {
      const error = new Error('model_id already exists for another model');
      error.statusCode = 409; // Conflict
      throw error;
    }
  }
  const query = `
    UPDATE models
    SET 
      model_status = $1,
      detection = $2,
      model_id = $3,
      level = $4
    WHERE id = $5
    RETURNING id, model_id, detection, model_status, level
  `;
  const { rows } = await db.query(query, [data.model_status,data.detection,data.model_id,data.level,id]);
  return rows[0];
};


exports.getModelAnalytics = async (userId) => {
  const query = `
   SELECT 
  COUNT(*) AS total_models,
  SUM(CASE 
        WHEN TRIM(detection) != '' THEN CAST(detection AS INTEGER) 
        ELSE 0 
      END) AS total_detections,
  SUM(CASE 
        WHEN TRIM(detection) != '' 
         AND model_date >= date_trunc('month', CURRENT_DATE)
         AND model_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
        THEN CAST(detection AS INTEGER)
        ELSE 0
      END) AS detections_this_month
FROM models
    WHERE user_id = $1;
  `;

  const { rows } = await db.query(query, [userId]);
  return rows[0];
};
