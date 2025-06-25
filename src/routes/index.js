const express = require('express');
const modelRoutes = require('./modelRoutes');

const router = express.Router();

router.use('/model', modelRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router;
