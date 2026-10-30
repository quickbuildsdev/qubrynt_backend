import { collections, MAP_COLLECTIONS } from '../models/collections.js'

const MAX_OPS = 1000
const SYSTEM_FIELDS = ['_id', 'userId']

/** GET /api/data: everything the signed-in user owns, shaped like the app's state. */
export async function getAll(req, res) {
  const userId = req.user.id
  const out = {}
  await Promise.all(
    Object.entries(collections).map(async ([name, Model]) => {
      const docs = await Model.find({ userId }).select('-_id -userId').lean()
      if (MAP_COLLECTIONS.has(name)) out[name] = Object.fromEntries(docs.map((d) => [d.id, d.value]))
      else if (name === 'settings') out[name] = docs[0] ? (({ id, ...rest }) => rest)(docs[0]) : null
      else out[name] = docs
    })
  )
  res.json(out)
}

/**
 * POST /api/data/sync  { ops: [ { c: "habits", id: "abc", data: {...} }, { c: "tasks", id: "xyz", del: true } ] }
 *
 * The app batches its changes and sends them here. Each operation is checked against the
 * collection's schema (types, lengths, allowed values) before it is saved. Invalid operations
 * are skipped and reported in `rejected`; valid ones are applied.
 */
export async function sync(req, res) {
  const userId = req.user.id
  const ops = req.body?.ops
  if (!Array.isArray(ops)) return res.status(400).json({ error: 'ops must be an array' })
  if (ops.length > MAX_OPS) return res.status(400).json({ error: `Send at most ${MAX_OPS} operations at a time` })

  const writes = {} // collection name -> bulkWrite operations
  const rejected = []
  const reject = (op, error) => rejected.push({ c: op?.c, id: op?.id, error })

  for (const op of ops) {
    const Model = typeof op?.c === 'string' && Object.hasOwn(collections, op.c) ? collections[op.c] : null
    if (!Model) { reject(op, 'unknown collection'); continue }
    // id must be a plain string: this also blocks query-operator injection such as { "$ne": null }
    if (typeof op.id !== 'string' || !op.id || op.id.length > 200) { reject(op, 'invalid id'); continue }
    const list = (writes[op.c] ??= [])

    if (op.del) {
      list.push({ deleteOne: { filter: { userId, id: op.id } } })
      continue
    }
    if (typeof op.data !== 'object' || op.data === null || Array.isArray(op.data)) { reject(op, 'data must be an object'); continue }

    // Build the document from the schema: unknown fields are dropped, types are cast, rules are checked.
    const doc = new Model({ ...op.data, userId, id: op.id })
    const err = doc.validateSync()
    if (err) { reject(op, Object.values(err.errors)[0]?.message ?? 'invalid data'); continue }
    const replacement = doc.toObject()
    for (const f of SYSTEM_FIELDS) if (f !== 'userId') delete replacement[f]
    list.push({ replaceOne: { filter: { userId, id: op.id }, replacement, upsert: true } })
  }

  await Promise.all(Object.entries(writes).filter(([, l]) => l.length).map(([name, l]) => collections[name].bulkWrite(l, { ordered: false })))
  res.json({ ok: true, applied: ops.length - rejected.length, rejected })
}
