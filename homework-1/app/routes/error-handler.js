exports.error = function(req, res, statusCode, message, err) {
    res.status(statusCode).json({
        message: message,
        error: err,
    });
};
