const mongoose = require("mongoose");

const connectMongo = async (mongoUri) => {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 5_000,
    });
    const { host, port, name, readyState } = mongoose.connection;
    console.log(
      `mongo connected (readyState=${readyState}) host=${host ?? "?"}:${port ?? "?"} db=${name ?? "?"}`
    );
  } catch (err) {
    const hint =
      mongoUri.includes("mongo:27017") || mongoUri.includes("redis:6379")
        ? [
            "MongoDB connection failed.",
            `You are using MONGO_URI=${mongoUri}, which only works when running via docker-compose (where the hostname 'mongo' exists).`,
            "Fix options:",
            "1) Run the whole stack: `cd C:\\Users\\91758\\All Projects\\ai-task\\app-repo && docker compose up --build`",
            "2) Or run MongoDB locally and set MONGO_URI to `mongodb://127.0.0.1:27017/aitask` in `backend/.env`",
          ].join("\n")
        : [
            "MongoDB connection failed.",
            `MONGO_URI=${mongoUri}`,
            "Verify MongoDB is running and the URI is reachable from this machine/container.",
          ].join("\n");

    const wrapped = new Error(`${hint}\n\nOriginal error: ${err?.message ?? String(err)}`);
    wrapped.cause = err;
    throw wrapped;
  }
};

const getMongoStatus = () => {
  const { host, port, name, readyState } = mongoose.connection ?? {};
  return {
    readyState: typeof readyState === "number" ? readyState : 0,
    host: host ?? null,
    port: typeof port === "number" ? port : null,
    db: name ?? null,
  };
};

module.exports = { connectMongo, getMongoStatus };
