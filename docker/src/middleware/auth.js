const jwt = require('jsonwebtoken');
const config = require('../config/env');
const crypto = require('crypto');
const model = require('../models/model');

module.exports = async(req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("Authentication required");
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const userSession = await model.fetchUserSessionByToken(decoded.id, tokenHash);
    if(!userSession){
      return res.status(401).json({
        status: false,
        status_code: 401,
        message: 'Session Expired'
      });
    }
    req.user = decoded;
    
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      status: false,
      message: 'Invalid or expired token'
    });
  }
};
