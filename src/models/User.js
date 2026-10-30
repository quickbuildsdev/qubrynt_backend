import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 200 },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export const User = mongoose.model('User', userSchema)
