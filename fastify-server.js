import { buildServer } from "./src/server/app.js";
import { getServerConfig } from "./src/server/config.js";

const config = getServerConfig();
const app = await buildServer(config);

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
