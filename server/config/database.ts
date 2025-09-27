import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { promisify } from 'util';
import { exec } from 'child_process';

dotenv.config();

const execPromise = promisify(exec);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
});

const runMigrations = async (): Promise<void> => {
  try {
    const { stdout } = await execPromise('npm run migrate');
    console.log(`Migration output: ${stdout}`);
  } catch (error) {
    console.error(`Error running migrations: ${(error as Error).message}`);
    throw error;
  }
};

export const initializeDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    await runMigrations();
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export default sequelize;
