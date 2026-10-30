import mongoose from 'mongoose'

const { Schema } = mongoose
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/
const dateField = { type: String, match: DATE }
const text = (max, extra = {}) => ({ type: String, maxlength: max, ...extra })
const days = {
  type: [Number],
  validate: { validator: (a) => a.length >= 1 && a.length <= 7 && a.every((n) => Number.isInteger(n) && n >= 0 && n <= 6), message: 'days must be 0-6' },
}
const httpUrl = (required) => ({
  type: String,
  maxlength: 2000,
  required,
  validate: { validator: (v) => !v || /^https?:\/\//i.test(v), message: 'URL must start with http:// or https://' },
})

/**
 * Every user-owned collection has the same two keys:
 *   userId : who owns the document
 *   id     : the id the app uses (a string), unique per user
 * Documents are always read and written through { userId, id }, so one user can never touch another user's data.
 */
function define(name, fields) {
  const schema = new Schema(
    { userId: { type: Schema.Types.ObjectId, required: true }, id: { type: String, required: true, maxlength: 200 }, ...fields },
    { strict: true, versionKey: false }
  )
  schema.index({ userId: 1, id: 1 }, { unique: true })
  return mongoose.model(name, schema)
}

export const collections = {
  habits: define('Habit', {
    name: text(80, { required: true }),
    emoji: text(8, { default: '🎯' }),
    type: { type: String, enum: ['check', 'number'], default: 'check' },
    unit: text(20),
    target: { type: Number, min: 0, max: 1e6, default: 1 },
    days,
    category: text(60),
    archived: Boolean,
  }),
  tasks: define('Task', {
    title: text(300, { required: true }),
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    category: text(60),
    due: dateField,
    notes: text(5000),
    done: { type: Boolean, default: false },
    doneAt: dateField,
    created: dateField,
  }),
  blocks: define('Block', {
    title: text(120, { required: true }),
    start: { type: String, match: TIME, required: true },
    end: { type: String, match: TIME, required: true },
    category: text(60),
    days,
  }),
  sessions: define('Session', {
    date: { ...dateField, required: true },
    minutes: { type: Number, min: 0, max: 1440, required: true },
    category: text(60),
    label: text(200),
    mode: text(20),
  }),
  learnings: define('Learning', { title: text(300, { required: true }), details: text(20000), tag: text(60), date: dateField, link: httpUrl(false) }),
  achievements: define('Achievement', { title: text(300, { required: true }), details: text(20000), tag: text(60), date: dateField, link: httpUrl(false) }),
  reflections: define('Reflection', {
    date: { ...dateField, required: true },
    mood: { type: Number, min: 0, max: 5, default: 0 },
    note: text(5000),
    well: text(5000),
    improve: text(5000),
  }),
  txs: define('Transaction', {
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, min: 0, max: 1e12, required: true },
    category: text(60),
    date: { ...dateField, required: true },
    note: text(500),
  }),
  goals: define('Goal', {
    title: text(200, { required: true }),
    kind: { type: String, enum: ['habit', 'income', 'tasks', 'focus', 'manual'], required: true },
    habitId: text(200),
    target: { type: Number, min: 0, max: 1e12, required: true },
    period: { type: String, enum: ['week', 'month', 'year'], required: true },
    progress: { type: Number, min: 0, max: 1e12 },
    unit: text(30),
  }),
  notebooks: define('Notebook', {
    title: text(200, { default: 'Untitled book' }),
    created: text(40),
  }),
  notes: define('Note', {
    bookId: text(200),
    title: text(300, { default: 'Untitled' }),
    body: text(200000),
    pinned: Boolean,
    created: text(40),
    updated: text(40),
  }),
  links: define('QuickLink', {
    title: text(80, { required: true }),
    url: httpUrl(true),
    icon: text(40, { default: 'auto' }),
  }),
  categories: define('Category', {
    name: text(40, { required: true }),
    type: { type: String, enum: ['activity', 'expense', 'income'], required: true },
  }),
  // key -> value maps (the id is "habitId|date" or "blockId|date")
  logs: define('HabitLog', { value: { type: Number, min: 0, max: 1e9, required: true } }),
  blockLogs: define('BlockLog', { value: { type: String, enum: ['done', 'skipped'], required: true } }),
  // one document per user, id is always "main"
  settings: define('Settings', {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    name: text(80),
    weekStart: { type: Number, enum: [0, 1], default: 1 },
    reminder: { type: String, match: TIME, default: '21:00' },
    reminderOn: { type: Boolean, default: false },
    navPosition: { type: String, enum: ['left', 'bottom'], default: 'left' },
  }),
}

export const MAP_COLLECTIONS = new Set(['logs', 'blockLogs'])
