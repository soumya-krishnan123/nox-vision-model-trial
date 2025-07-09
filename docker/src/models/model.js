const db = require('../config/db');


// File upload related operations
exports.createFileUpload = async (fileData) => {

  const { 
    user_id, 
    filename,    
    file_path,     
    thumbnail_path, 
    file_type, 
    file_size,
    detection ,
    model_id
  } = fileData;


    // Step 1: Get latest model_id
    const result = await db.query(`
      SELECT model_id 
      FROM models 
      WHERE model_id IS NOT NULL
      ORDER BY created_at DESC 
      LIMIT 1
    `);
  
    let newModelId = 'model00001';
  
    if (result.rows.length > 0 && result.rows[0].model_id) {
      const lastId = result.rows[0].model_id; 
      const numberPart = parseInt(lastId.replace('model', '')) || 0;
      const nextNumber = numberPart + 1;
      newModelId = 'model' + String(nextNumber).padStart(5, '0'); 
    }
  const model_date = new Date();
  const query = `
    INSERT INTO models (
      user_id,
      model_name,
      model_path,
      thumbnail_path,
      file_type,
      file_size,
      
      model_date,
      model_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING 
      id, user_id, model_name, model_path, thumbnail_path, 
      file_type, file_size, model_id,
      created_at, updated_at
  `;

  const values = [
    user_id,
    filename,
    file_path,
    thumbnail_path,
    file_type,
    file_size,
   
    model_date,
    newModelId
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
};


exports.getModelsByUserId = async (userId) => {
  const query = `
    SELECT id, model_name, model_path, thumbnail_path, file_type, file_size, created_at,detection,model_status,level,model_date,model_id
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
  // if (data.model_id) {
  //   // Check for duplicate model_id owned by the same user but different id
  //   const duplicateCheckQuery = `
  //     SELECT id FROM models 
  //     WHERE model_id = $1  AND id != $2
  //     LIMIT 1
  //   `;
  //   const { rows } = await db.query(duplicateCheckQuery, [data.model_id, id]);
  //   if (rows.length > 0) {
  //     const error = new Error('model_id already exists for another model');
  //     error.statusCode = 409; // Conflict
  //     throw error;
  //   }
  // }



  const query = `
    UPDATE models
    SET 
      model_status = $1,
      detection =detection + $2,
     
      level = $3
    WHERE model_id = $4
    RETURNING id, model_id, detection, model_status, level
  `;
  const { rows } = await db.query(query, [data.model_status,data.detection,data.level,data.model_id]);
  return rows[0];
};

//get active subscription from subscriptions
exports.getActiveSubPlanforUserId=async(userId)=>{
  console.log(userId);
  
  const query = `
  SELECT plan_id 
FROM subscriptions 
WHERE user_id = $1 AND subscription_status = 'active'
LIMIT 1;
`;

const { rows } = await db.query(query, [userId]);
return rows[0];
  
}
//get monthly quota 
exports.getMonthlyQuotaforSubId=async(plan_id)=>{
console.log(plan_id);

  const query = `
SELECT uploads, detections
  FROM subscription_plans
  WHERE plan_id = $1;
`;

const { rows } = await db.query(query, [plan_id]);
return rows[0];
}


exports.getModelAnalyticsForMonth = async (userId) => {
  const query = `
SELECT 
  COUNT(*) AS total_models,
  SUM(detection) AS total_detections,

  SUM(CASE 
        WHEN model_date >= date_trunc('month', CURRENT_DATE)
         AND model_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
        THEN detection
        ELSE 0
      END) AS detections_this_month,
      COUNT(CASE 
          WHEN model_date >= date_trunc('month', CURRENT_DATE)
           AND model_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
          THEN 1
        END) AS uploads_this_month
FROM models
WHERE user_id = $1;

  `;

  const { rows } = await db.query(query, [userId]);
  return rows[0];
};


// Fetch user session by token
//for auth middleware by using user session
exports.fetchUserSessionByToken = async (userId, token) => {
  const query =
    'SELECT * FROM user_sessions WHERE user_id = $1 AND token = $2'
  const { rows } = await db.query(query, [userId, token]);
  return rows[0];
};