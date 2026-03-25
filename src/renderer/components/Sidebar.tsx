import { type View } from '../hooks/useWorkspace.ts';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  changesCount: number;
  hasWorkingCopy: boolean;
}

const views: { id: View; icon: string; label: string; requiresWc: boolean }[] = [
  { id: 'browse', icon: '📁', label: 'リポジトリ', requiresWc: false },
  { id: 'changes', icon: '📝', label: '変更', requiresWc: true },
  { id: 'log', icon: '📋', label: 'ログ', requiresWc: false },
  { id: 'merge', icon: '🔀', label: 'マージ', requiresWc: true },
];

export function Sidebar({ currentView, onViewChange, changesCount, hasWorkingCopy }: SidebarProps) {
  return (
    <div className="sidebar">
      <nav className="sidebar-nav">
        {views.map(v => (
          <button
            key={v.id}
            className={`sidebar-item ${currentView === v.id ? 'active' : ''}`}
            onClick={() => onViewChange(v.id)}
            disabled={v.requiresWc && !hasWorkingCopy}
            style={v.requiresWc && !hasWorkingCopy ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            <span className="icon">{v.icon}</span>
            <span>{v.label}</span>
            {v.id === 'changes' && changesCount > 0 && (
              <span className="badge">{changesCount}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
