const modelServices = require('../services/modelServices');


// File upload controllers
exports.uploadModel = async (req, res, next) => {
  try {
    await modelServices.uploadModel(req, res, next);
  } catch (error) {
    next(error);
  }
};

exports.getModels = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const models = await modelServices.getModels(userId);
    res.status(200).json({
      status: true,
      status_code: 200,
      message: 'Models retrieved successfully',
      data: models
    });
  } catch (error) {
    next(error);
  }
};

exports.getModelById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const modelId = req.params.id;
    const model = await modelServices.getModelById(modelId, userId);
    res.status(200).json({
      status: true,
      status_code: 200,
      data: model
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteModel = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const modelId = req.params.id;
    const deletedModel = await modelServices.deleteModel(modelId, userId);
    res.status(200).json({
      status: true,
      status_code: 200,
      message: 'Model deleted successfully',
      data: deletedModel
    });
  } catch (error) {
    next(error);
  }
}; 

exports.updateModel = async (req, res, next) => {
  try {
    const modelId = req.params.id;
    const updatedModel = await modelServices.updateModel(modelId, req.body);
    res.status(200).json({
      status: true,
      status_code: 200,
      message: 'Model updated successfully',
      data: updatedModel
    });
  } catch (error) {
    next(error);
  }
};    

exports.getModelAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log(userId);
    const analytics = await modelServices.getModelAnalytics(userId);
    res.status(200).json({
      status: true,
      status_code: 200,
      message: 'Model analytics retrieved successfully',
      data: analytics
    }); 
  } catch (error) {
    next(error);
  }
};