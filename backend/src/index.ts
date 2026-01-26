import "dotenv/config";
import { buildServer } from "./app.js";

const app = buildServer();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

app
  .listen({ port, host })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
