class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status; // errorMiddleware에서 이 status로 응답
  }
}
module.exports = AppError;