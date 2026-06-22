import { app } from './app.js';
import { sequelize } from './models/index.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  let retries = 10;
  let connected = false;

  while (retries > 0 && !connected) {
    try {
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');

      await sequelize.sync({ alter: true });
      console.log('Database schemas synchronized.');

      connected = true;
    } catch (err) {
      console.error('Unable to connect to the database. Error detail:', err);
      retries -= 1;
      if (retries > 0) {
        console.log(`Retries remaining: ${retries}. Waiting 5 seconds before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  if (!connected) {
    console.error('Could not connect to the database after multiple retries. Exiting...');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer();
export { };
