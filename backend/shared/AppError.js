// shared/AppError.js
class AppError extends Error {
    constructor(message, statusCode, data = undefined) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.data = data;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;