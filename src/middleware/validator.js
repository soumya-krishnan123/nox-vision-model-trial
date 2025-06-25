const Joi = require('joi');

// validators/userValidator.js
exports.validateVerifyOtp = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(), // assuming 6-digit OTP
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorObj = {};
    error.details.forEach(detail => {
      errorObj[detail.path[0]] = detail.message;
    });
    return res.status(400).json({ status: false, errors: errorObj });
  }

  next();
};
