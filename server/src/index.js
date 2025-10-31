import "dotenv/config";
import http from "http";
import app from "./app.js";
import prisma from "./config/prisma.js";
import bootstrap from "./utils/bootstrap.js";

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await bootstrap();

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`MontongMoon API listening on port ${PORT}`);
    });

    const signals = ["SIGTERM", "SIGINT", "SIGUSR2"];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`Received ${signal}, closing server...`);
        server.close(async () => {
          await prisma.$disconnect();
          process.exit(0);
        });
      });
    });
  } catch (err) {
    console.error("Failed to start server", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
