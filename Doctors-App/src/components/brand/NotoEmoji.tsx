/**
 * The app's emoji are Google's Noto set (CC BY 4.0), never the phone's text emoji, so they look the
 * same on every device. Still by default (public/emoji/still/*.svg); `animated` swaps in the moving
 * version (public/emoji/*.webp), which we only show when something is happening: a wish being sent,
 * a count going up, love arriving on screen. The server stores and sends the plain characters
 * ("❤️"); anything we don't have a file for falls back to the character.
 */
const FILES: Record<string, string> = {
  "❤️": "heart",
  "❤": "heart",
  "🌸": "flower",
  "👏": "clap",
  "⭐": "star",
  "🙏": "prayer",
  "🎉": "party",
  "🤗": "hug",
  "🥰": "warmth",
  "💪": "strength",
};

export const notoSrc = (emoji: string, animated = false) => {
  const name = FILES[emoji];
  if (!name) return null;
  return animated ? `/emoji/${name}.webp` : `/emoji/still/${name}.svg`;
};

export default function NotoEmoji({
  emoji,
  size = 28,
  className = "",
  animated = false,
}: {
  emoji: string;
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const src = notoSrc(emoji, animated);
  if (!src) {
    return (
      <span className={className} style={{ fontSize: size * 0.85, lineHeight: 1 }} aria-hidden="true">
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      className={`inline-block max-w-none select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
