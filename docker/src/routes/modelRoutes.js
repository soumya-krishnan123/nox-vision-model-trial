const express = require('express');
const modelController = require('../controllers/modelController');
const auth = require('../middleware/auth');


const router = express.Router();

// File upload routes
router.post('/upload', auth, modelController.uploadModel);
router.get('/models', auth, modelController.getModels);
router.get('/analytics', auth, modelController.getModelAnalytics);

router.get('/:id', auth, modelController.getModelById);
router.put('/:id', auth, modelController.updateModel);
router.delete('/:id', auth, modelController.deleteModel);
router.get('/getByModelId/:id', auth, modelController.getModelByModelId);
module.exports = router;
