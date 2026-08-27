const STYLES = {
  HOT: 'bg-red-50 text-red-700 border-red-200',
  WARM: 'bg-amber-50 text-amber-700 border-amber-200',
  NURTURE: 'bg-blue-50 text-blue-700 border-blue-200',
  LOW: 'bg-gray-50 text-gray-500 border-gray-200',
};

const EMOJI = { HOT: '🔥', WARM: '🟡', NURTURE: '🔵', LOW: '⚪' };

export function PriorityBadge({ priority }) {
  if (!priority) return <span className="text-ink-soft text-xs">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${STYLES[priority] || STYLES.LOW}`}>
      {EMOJI[priority]} {priority}
    </span>
  );
}
