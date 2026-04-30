const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const envPath = path.resolve(process.cwd(), ".env");
const envExamplePath = path.resolve(process.cwd(), ".env.example");
dotenv.config({ path: fs.existsSync(envPath) ? envPath : envExamplePath });

const { env } = require("./config/env");
const { connectMongo } = require("./config/mongo");
const { createRedis } = require("./config/redis");
const { createApp } = require("./app");

const main = async () => {
  await connectMongo(env.mongoUri);
  const redis = createRedis(env.redisUrl);
  const app = createApp({ redis });

  app.listen(env.port, () => {
    console.log(`backend listening on :${env.port}`);
  });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
