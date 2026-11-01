// What can be bought and sent. 1 coin = 1 US cent ($0.01).

export type GiftTier = 'small' | 'banner' | 'fullscreen';

export type Gift = { id: string; name: string; emoji: string; coins: number; tier: GiftTier };

/**
 * banner: shown on the Wish Well banner ("Amaka sent a Rainbow to Tunde")
 * fullscreen: also plays a full-screen animation for everyone online
 */
export const GIFTS: Gift[] = [
  { id: 'rose', name: 'Rose', emoji: '🌹', coins: 1, tier: 'small' },
  { id: 'heart', name: 'Heart', emoji: '💖', coins: 5, tier: 'small' },
  { id: 'tea', name: 'Get-well Tea', emoji: '🍵', coins: 20, tier: 'small' },
  { id: 'bouquet', name: 'Bouquet', emoji: '💐', coins: 50, tier: 'small' },
  { id: 'teddy', name: 'Teddy Bear', emoji: '🧸', coins: 100, tier: 'small' },
  { id: 'balloons', name: 'Balloons', emoji: '🎈', coins: 250, tier: 'small' },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', coins: 500, tier: 'banner' },
  { id: 'sunrise', name: 'Sunrise', emoji: '🌅', coins: 1000, tier: 'fullscreen' },
  { id: 'angel', name: 'Guardian Angel', emoji: '👼', coins: 5000, tier: 'fullscreen' },
  { id: 'galaxy', name: 'Galaxy of Hope', emoji: '🌌', coins: 10000, tier: 'fullscreen' },
];

export const giftById = (id: unknown) => GIFTS.find((g) => g.id === id);

/** Coin packs; bigger packs come with bonus coins. cents is what the buyer pays. */
export const COIN_PACKS = [
  { id: 'p100', coins: 100, cents: 100 },
  { id: 'p500', coins: 500, cents: 500 },
  { id: 'p1100', coins: 1100, cents: 1000, bonus: 100 },
  { id: 'p5750', coins: 5750, cents: 5000, bonus: 750 },
  { id: 'p12000', coins: 12000, cents: 10000, bonus: 2000 },
] as const;

export const packById = (id: unknown) => COIN_PACKS.find((p) => p.id === id);

const intEnv = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const walletSettings = () => ({
  /** share of each gift the platform keeps (the rest goes to the patient's care fund) */
  feePercent: Math.min(90, intEnv('GIFT_PLATFORM_FEE_PERCENT', 20)),
  /** most coins one person can gift per day */
  dailyGiftLimit: intEnv('GIFT_DAILY_LIMIT_COINS', 20000),
  /** smallest withdrawal, in cents */
  minPayoutCents: intEnv('PAYOUT_MIN_CENTS', 1000),
  /** buyers and senders must be at least this old */
  minAge: 18,
});
