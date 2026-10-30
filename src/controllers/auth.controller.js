import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'
import { collections } from '../models/collections.js'
import { signToken } from '../middleware/auth.js'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../utils/defaults.js'
import { HttpError } from '../utils/http.js'

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(200),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) })

const parse = (schema, body) => {
  const r = schema.safeParse(body)
  if (!r.success) throw new HttpError(400, r.error.issues[0].message)
  return r.data
}
const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email })
const session = (u) => ({ token: signToken(u._id), user: publicUser(u) })
// A real bcrypt hash of a random string. Compared against when the email is unknown so that response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10)

export async function register(req, res) {
  const { name, email, password } = parse(registerSchema, req.body)
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists')
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 11) })

  // starting data: default categories and settings
  const userId = user._id
  await collections.categories.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })))
  await collections.settings.create({ ...DEFAULT_SETTINGS, name, userId, id: 'main' })
  res.status(201).json(session(user))
}

export async function login(req, res) {
  const { email, password } = parse(loginSchema, req.body)
  const user = await User.findOne({ email })
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok) throw new HttpError(401, 'Invalid email or password')
  res.json(session(user))
}

export async function me(req, res) {
  const user = await User.findById(req.user.id)
  if (!user) throw new HttpError(401, 'Account not found')
  res.json({ user: publicUser(user) })
}

export async function deleteAccount(req, res) {
  const { password } = parse(z.object({ password: z.string().min(1).max(128) }), req.body)
  const user = await User.findById(req.user.id)
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Password is incorrect')
  await Promise.all(Object.values(collections).map((M) => M.deleteMany({ userId: user._id })))
  await user.deleteOne()
  res.json({ ok: true })
}
