import mongoose from 'mongoose'
import { config } from './config/index.js'
import { createApp } from './app.js'
import { collections } from './models/collections.js'
import { User } from './models/User.js'

async function start() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 })
  } catch (err) {
    console.error(`\nCould not connect to MongoDB at ${config.mongoUri.replace(/\/\/.*@/, '//***@')}`)
    console.error(`Reason: ${err.message}\n`)
    console.error('Check that MongoDB is running (or that your Atlas connection string and IP allow-list are right), then edit backend/.env\n')
    process.exit(1)
  }
  await Promise.all([User.init(), ...Object.values(collections).map((M) => M.init())]) // make sure indexes exist
  createApp().listen(config.port, () => console.log(`API ready on http://localhost:${config.port}  (db: ${mongoose.connection.name})`))
}

process.on('SIGINT', () => mongoose.disconnect().finally(() => process.exit(0)))
start()
