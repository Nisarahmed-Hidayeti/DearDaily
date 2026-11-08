export const studioMetadataEnabled =
  import.meta.env.VITE_ENABLE_JOURNAL_STUDIO === 'true'
export const moodOptions = [
  ['Calm', '☁'],
  ['Happy', '☀'],
  ['Reflective', '☾'],
  ['Low', '☂'],
  ['Grateful', '✿'],
  ['Hopeful', '↗'],
  ['Excited', '✦'],
  ['Proud', '★'],
  ['Energized', 'ϟ'],
  ['Content', '☺'],
  ['Tired', '☾'],
  ['Anxious', '〰'],
  ['Overwhelmed', '☔'],
  ['Lonely', '☽'],
  ['Frustrated', '↯'],
  ['Mixed', '◐'],
] as const
export type Mood = (typeof moodOptions)[number][0]
export const allJournalCategories = [
  'Personal',
  'Gratitude',
  'Growth',
  'Travel',
  'Work',
  'Study',
  'Family',
  'Friends',
  'Health',
  'Creativity',
  'Dreams',
  'Memories',
] as const
export const journalCategories: readonly string[] = studioMetadataEnabled
  ? allJournalCategories
  : allJournalCategories.slice(0, 4)
export const availableMoods = studioMetadataEnabled
  ? moodOptions
  : moodOptions.slice(0, 4)
