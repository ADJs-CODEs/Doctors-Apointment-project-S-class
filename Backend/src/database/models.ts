// Model names must stay exactly as the Express app had them: mongoose derives the
// collection name from them (doctor -> doctors, emojipping -> emojippings, ...),
// and the live data already sits in those collections.
export const MODEL = {
  doctor: 'doctor',
  user: 'user',
  appointment: 'appointment',
  connection: 'connection',
  emojiPing: 'emojipping',
  notification: 'notification',
  wishWell: 'wishwell',
} as const;
