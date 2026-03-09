// middleware/errorHandler.js
import AppError from "../shared/AppError.js";

const errorHandler = (err, req, res, next) => {
  console.error("Global Error:", err);

  // Agar AppError hai (operational error)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.data && { data: err.data }),
    });
  }

  // Unknown/unexpected error
  res.status(500).json({
    message: "Something went wrong",
  });
};

export default errorHandler;