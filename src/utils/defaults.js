// Categories every new account starts with. Users can edit them in Settings.
const make = (type, names) => names.map((name) => ({ id: `${type}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, type }))

export const DEFAULT_CATEGORIES = [
  ...make('activity', ['Health', 'Work', 'Study', 'Mind', 'Finance', 'Other']),
  ...make('expense', ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Other']),
  ...make('income', ['Salary', 'Freelance', 'Business', 'Investments', 'Other']),
]

export const DEFAULT_SETTINGS = { theme: 'light', name: '', weekStart: 1, reminder: '21:00', reminderOn: false, navPosition: 'left' }
