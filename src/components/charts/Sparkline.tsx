interface SparklineProps {
  data: number[];
  height?: number;
  color?: string;
  fillOpacity?: number;
}

export function Sparkline({
  data,
  height = 40,
  color = '#94B0DA',
  fillOpacity = 0.25,
}: SparklineProps) {
  if (data.length < 2) {
    return <div style={{ height }} />;
  }
  const w = 100;
  const h = 30;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return [x, y];
  });

  const path =
    'M ' +
    points
      .map(([x, y], i) => (i === 0 ? `${x},${y}` : `L ${x},${y}`))
      .join(' ');

  const areaPath = `${path} L ${w},${h} L 0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
    >
      <path d={areaPath} fill={color} fillOpacity={fillOpacity} />
      <path d={path} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
