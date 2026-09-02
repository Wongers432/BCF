/**
 * SparkLine — tiny neon SVG price-spread chart.
 * `points` is a number[] of pricePerUnit from sell_summary orders.
 * A flat line = tight/liquid market; steep curve = wide spread (volatility proxy).
 */
export default function SparkLine({ points }) {
  if (!points || points.length < 2) return null;

  const W = 64;
  const H = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const ptStr = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * (W - 2) + 1;
      const y = H - 1 - ((p - min) / range) * (H - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={W}
      height={H}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <filter id="spark-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polyline
        points={ptStr}
        fill="none"
        stroke="#00f5ff"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter="url(#spark-glow)"
      />
    </svg>
  );
}

