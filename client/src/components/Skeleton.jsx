// client/src/components/Skeleton.jsx
export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-black/10 dark:bg-white/10 rounded ${className}`} />;
}
