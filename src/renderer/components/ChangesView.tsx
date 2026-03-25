import { useState, useEffect, useCallback, useMemo } from 'react';

interface ChangesProps {
  wcPath: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onStatusChange: (count: number) => void;
}

interface StatusEntry {
  status: string;
  path: string;
}

const statusMap: Record<string, { label: string; letter: string; className: string }> = {
  modified: { label: '変更', letter: 'M', className: 'status-modified' },
  added: { label: '追加', letter: 'A', className: 'status-added' },
  deleted: { label: '削除', letter: 'D', className: 'status-deleted' },
  unversioned: { label: '未管理', letter: '?', className: 'status-unversioned' },
  missing: { label: '欠落', letter: '!', className: 'status-missing' },
  conflicted: { label: '競合', letter: 'C', className: 'status-conflicted' },
  replaced: { label: '置換', letter: 'R', className: 'status-modified' },
  obstructed: { label: '障害', letter: '~', className: 'status-conflicted' },
};

export function ChangesView({ wcPath, onError, onSuccess, onStatusChange }: ChangesProps) {
  const [entries, setEntries] = useState<StatusEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<string>('');
  const [diffFile, setDiffFile] = useState<string | null>(null);
  const [commitMsg, setCommitMsg] = useState('');
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [committing, setCommitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.svn.status(wcPath);
      setEntries(result);
      onStatusChange(result.length);
    } catch (err: any) {
      onError('ステータス取得失敗: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, [wcPath, onError, onStatusChange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleSelect = (path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map(e => e.path)));
    }
  };

  const showDiff = async (filePath: string) => {
    setDiffFile(filePath);
    try {
      const d = await window.svn.diff(wcPath, filePath);
      setDiff(d);
    } catch (err: any) {
      setDiff('差分を取得できません: ' + (err.message || err));
    }
  };

  const revertFiles = async (files: string[]) => {
    if (files.length === 0) return;
    try {
      await window.svn.revert(wcPath, files);
      onSuccess(`${files.length}件のファイルをリバートしました`);
      setSelected(new Set());
      setDiff('');
      setDiffFile(null);
      refresh();
    } catch (err: any) {
      onError('リバート失敗: ' + (err.message || err));
    }
  };

  const addFiles = async (files: string[]) => {
    try {
      await window.svn.add(wcPath, files);
      onSuccess(`${files.length}件のファイルを追加しました`);
      refresh();
    } catch (err: any) {
      onError('追加失敗: ' + (err.message || err));
    }
  };

  const commitFiles = async () => {
    if (!commitMsg.trim()) return;
    setCommitting(true);
    try {
      const files = selected.size > 0 ? Array.from(selected) : undefined;
      await window.svn.commit(wcPath, commitMsg, files);
      onSuccess('コミットしました');
      setCommitMsg('');
      setShowCommitDialog(false);
      setSelected(new Set());
      setDiff('');
      setDiffFile(null);
      refresh();
    } catch (err: any) {
      onError('コミット失敗: ' + (err.message || err));
    } finally {
      setCommitting(false);
    }
  };

  const updateWc = async () => {
    try {
      const result = await window.svn.update(wcPath);
      onSuccess('更新完了: ' + result.trim().split('\n').pop());
      refresh();
    } catch (err: any) {
      onError('更新失敗: ' + (err.message || err));
    }
  };

  const commitableEntries = useMemo(() =>
    entries.filter(e => e.status !== 'unversioned'),
    [entries]
  );

  const unversionedEntries = useMemo(() =>
    entries.filter(e => e.status === 'unversioned'),
    [entries]
  );

  const renderDiffLines = (diffText: string) => {
    return diffText.split('\n').map((line, i) => {
      let className = '';
      if (line.startsWith('+') && !line.startsWith('+++')) className = 'diff-line-add';
      else if (line.startsWith('-') && !line.startsWith('---')) className = 'diff-line-del';
      else if (line.startsWith('@@')) className = 'diff-line-info';
      else if (line.startsWith('Index:') || line.startsWith('===') || line.startsWith('---') || line.startsWith('+++')) className = 'diff-line-file';
      return <div key={i} className={className}>{line || ' '}</div>;
    });
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <h2>変更 ({entries.length})</h2>
        <div style={{ flex: 1 }} />
        <div className="btn-group">
          <button className="btn btn-sm" onClick={updateWc}>⬇️ 更新</button>
          <button className="btn btn-sm" onClick={refresh}>🔄 再読込</button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => revertFiles(selected.size > 0 ? Array.from(selected) : entries.filter(e => e.status !== 'unversioned').map(e => e.path))}
            disabled={commitableEntries.length === 0}
          >
            ↩️ リバート
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowCommitDialog(true)}
            disabled={commitableEntries.length === 0}
          >
            ✅ コミット
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* File list */}
        <div style={{ width: '40%', borderRight: '1px solid var(--border)', overflow: 'auto', padding: '8px' }}>
          {loading ? (
            <div className="loading"><div className="spinner" /> 読み込み中...</div>
          ) : entries.length === 0 ? (
            <div className="empty-state">
              <div className="icon">✅</div>
              <div>変更はありません</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '4px 10px', marginBottom: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>
                  <input type="checkbox" checked={selected.size === entries.length && entries.length > 0} onChange={selectAll} />
                  すべて選択
                </label>
              </div>
              <div className="status-list">
                {entries
                  .sort((a, b) => a.path.localeCompare(b.path))
                  .map(entry => {
                    const info = statusMap[entry.status] || { label: entry.status, letter: '?', className: '' };
                    return (
                      <div
                        key={entry.path}
                        className="status-item"
                        onClick={() => showDiff(entry.path)}
                        style={diffFile === entry.path ? { background: 'var(--bg-surface)' } : {}}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(entry.path)}
                          onChange={(e) => { e.stopPropagation(); toggleSelect(entry.path); }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={`status-badge ${info.className}`} title={info.label}>
                          {info.letter}
                        </span>
                        <span className="file-path" title={entry.path}>
                          {entry.path}
                        </span>
                        <div className="actions">
                          {entry.status === 'unversioned' && (
                            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); addFiles([entry.path]); }} title="svn add">
                              ➕
                            </button>
                          )}
                          {entry.status !== 'unversioned' && (
                            <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); revertFiles([entry.path]); }} title="リバート">
                              ↩️
                            </button>
                          )}
                          <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); window.shell.openPath(entry.path); }} title="開く">
                            📂
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        {/* Diff panel */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {diff ? (
            <>
              <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                {diffFile}
              </div>
              <div className="diff-raw">{renderDiffLines(diff)}</div>
            </>
          ) : (
            <div className="empty-state">
              <div className="icon">📄</div>
              <div>ファイルを選択して差分を確認</div>
            </div>
          )}
        </div>
      </div>

      {/* Commit Dialog */}
      {showCommitDialog && (
        <div className="modal-overlay" onClick={() => setShowCommitDialog(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: 560 }}>
            <div className="modal-header">
              <h3>コミット</h3>
              <button className="btn btn-sm" onClick={() => setShowCommitDialog(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">コミットメッセージ</label>
                <textarea
                  className="input"
                  rows={4}
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  placeholder="変更内容を記述..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  対象ファイル ({selected.size > 0 ? selected.size : commitableEntries.length}件)
                </label>
                <div style={{ maxHeight: 200, overflow: 'auto', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  {(selected.size > 0 ? entries.filter(e => selected.has(e.path)) : commitableEntries).map(e => {
                    const info = statusMap[e.status] || { letter: '?', className: '' };
                    return (
                      <div key={e.path} style={{ padding: '3px 0', display: 'flex', gap: 8 }}>
                        <span className={info.className}>{info.letter}</span>
                        <span>{e.path}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowCommitDialog(false)}>キャンセル</button>
              <button
                className="btn btn-primary"
                onClick={commitFiles}
                disabled={!commitMsg.trim() || committing}
              >
                {committing ? 'コミット中...' : 'コミット'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
