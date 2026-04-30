// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  const status = Number(err.status ?? 500);
  const message = err.message ?? "Internal Server Error";
  return res.status(status).json({ error: message });
};

module.exports = { errorMiddleware };
