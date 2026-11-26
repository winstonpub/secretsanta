export default function Avatar({
  avatar,
  color,
  size = 36,
  className = "",
}: {
  avatar: string;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-white/80 ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.58,
        lineHeight: 1,
      }}
    >
      {avatar}
    </span>
  );
}
