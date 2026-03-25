import { useState, useEffect, useCallback } from 'react';

interface MergeViewProps {
  wcPath: string;
  repoRoot: string;
  repoUrl: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

interface Branch {
  name: string;
  kind: string;
}

interface LogEntry {
  revision: string;
  author: string;
  date: string;
  message: string;
}

type MergeMode = 'branch' | 'cherrypick';

export function MergeView({ wcPath, repoRoot, repoUrl, onError, onSuccess }: MergeViewProps) {
  const [mode, setMode] = useState<MergeMode>('branch');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branchUrl, setBranchUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  // Cherry-pick state
  const [sourceLog, setSourceLog] = useState<LogEntry[]>([]);
  const [selectedRevisions, setSelectedRevisions] = useState<Set<string>>(new Set());
  const [logLoading, setLogLoading] = useState(false);

  // Merge range
  const [startRev, setStartRev] = useState('');
  const [endRev, setEndRev] = useState('');

  // Merge preview
  const [preview, setPreview] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const [branchList, tagList] = await Promise.all([
        window.svn.branches(repoRoot),
        window.svn.tags(repoRoot),
      ]);
      const items: Branch[] = [
        { name: 'trunk', kind: 'trunk' },
        ...branchList.map(b => ({ name: `branches/${b.name}`, kind: 'branch' })),
        ...tagList.map(t => ({ name: `tags/${t.name}`, kind: 'tag' })),
      ];
      setBranches(items);
    } catch (err: any) {
      onError('ブランチ一覧取得失敗: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, [repoRoot, onError]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const onBranchSelect = async (branchName: string) => {
    setSelectedBranch(branchName);
    const url = repoRoot + '/' + branchName;
    setBranchUrl(url);
    setSelectedRevisions(new Set());

    if (mode === 'cherrypick') {
      setLogLoading(true);
      try {
        const log = await window.svn.log(url, 50);
        setSourceLog(log);
      } catch (err: any) {
        onError('ログ取得失敗: ' + (err.message || err));
      } finally {
        setLogLoading(false);
      }
    }
  };

  const toggleRevision = (rev: string) => {
    setSelectedRevisions(prev => {
      const next = new Set(prev);
      if (next.has(rev)) next.delete(rev);
      else next.add(rev);
      return next;
    });
  };

  const dryRun = async () => {
    const sourceUrl = branchUrl || (repoRoot + '/' + selectedBranch);
    if (!sourceUrl) return;
    try {
      let result: string;
      if (mode === 'cherrypick' && selectedRevisions.size > 0) {
        const revs = Array.from(selectedRevisions).sort((a, b) => parseInt(a) - parseInt(b)).join(',');
        result = await window.svn.mergeDryRun(wcPath, sourceUrl, revs);
      } else {
        result = await window.svn.mergeDryRun(wcPath, sourceUrl);
      }
      setPreview(result || 'マージする変更はありません');
      setShowPreview(true);
    } catch (err: any) {
      onError('ドライラン失敗: ' + (err.message || err));
    }
  };

  const executeMerge = async () => {
    const sourceUrl = branchUrl || (repoRoot + '/' + selectedBranch);
    if (!sourceUrl) return;
    setMerging(true);
    try {
      if (mode === 'cherrypick' && selectedRevisions.size > 0) {
        const revs = Array.from(selectedRevisions).sort((a, b) => parseInt(a) - parseInt(b)).join(',');
        await window.svn.merge(wcPath, sourceUrl, revs);
        onSuccess(`リビジョン ${revs} をチェリーピックしました`);
      } else if (mode === 'branch' && startRev && endRev) {
        await window.svn.mergeRange(wcPath, sourceUrl, startRev, endRev);
        onSuccess(`r${startRev}:${endRev} をマージしました`);
      } else {
        await window.svn.merge(wcPath, sourceUrl);
        onSuccess(`${selectedBranch} をマージしました`);
      }
      setShowPreview(false);
    } catch (err: any) {
      onError('マージ失敗: ' + (err.message || err));
    } finally {
      setMerging(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>マージ</h2>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={loadBranches}>🔄 更新</button>
      </div>

      <div className="tabs">
        <button className={`tab ${mode === 'branch' ? 'active' : ''}`} onClick={() => setMode('branch')}>
          ブランチマージ
        </button>
        <button className={`tab ${mode === 'cherrypick' ? 'active' : ''}`} onClick={() => setMode('cherrypick')}>
          チェリーピック
        </button>
      </div>

      <div className="panel-body">
        {/* Source branch selector */}
        <div className="form-group">
          <label className="form-label">マージ元</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="input"
              value={selectedBranch}
              onChange={e => onBranchSelect(e.target.value)}
            >
              <option value="">ブランチを選択...</option>
              {branches.map(b => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">マージ先 (作業コピー)</label>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
            {wcPath}
            <br />
            <span style={{ color: 'var(--accent)' }}>{repoUrl}</span>
          </div>
        </div>

        {/* Branch merge options */}
        {mode === 'branch' && selectedBranch && (
          <div className="form-group">
            <label className="form-label">リビジョン範囲 (オプション、空の場合すべてマージ)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input input-mono"
                style={{ width: 120 }}
                placeholder="開始 rev"
                value={startRev}
                onChange={e => setStartRev(e.target.value)}
              />
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <input
                className="input input-mono"
                style={{ width: 120 }}
                placeholder="終了 rev"
                value={endRev}
                onChange={e => setEndRev(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Cherry pick revision selector */}
        {mode === 'cherrypick' && selectedBranch && (
          <div className="form-group">
            <label className="form-label">
              リビジョン選択 ({selectedRevisions.size}件選択中)
            </label>
            {logLoading ? (
              <div className="loading"><div className="spinner" /> ログ読み込み中...</div>
            ) : (
              <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)' }}>
                <table className="log-table">
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}></th>
                      <th>Rev</th>
                      <th>Author</th>
                      <th>日時</th>
                      <th>メッセージ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceLog.map(entry => (
                      <tr
                        key={entry.revision}
                        onClick={() => toggleRevision(entry.revision)}
                        style={{ cursor: 'pointer', background: selectedRevisions.has(entry.revision) ? 'var(--bg-surface)' : undefined }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedRevisions.has(entry.revision)}
                            onChange={() => toggleRevision(entry.revision)}
                            style={{ accentColor: 'var(--accent)' }}
                          />
                        </td>
                        <td className="rev">r{entry.revision}</td>
                        <td className="author">{entry.author}</td>
                        <td className="date">{formatDate(entry.date)}</td>
                        <td className="message" title={entry.message}>{entry.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {selectedBranch && (
          <div className="btn-group" style={{ marginTop: 16 }}>
            <button className="btn" onClick={dryRun} disabled={merging}>
              🔍 プレビュー (ドライラン)
            </button>
            <button className="btn btn-primary" onClick={executeMerge} disabled={merging || (mode === 'cherrypick' && selectedRevisions.size === 0)}>
              {merging ? 'マージ中...' : '🔀 マージ実行'}
            </button>
          </div>
        )}

        {/* Merge preview */}
        {showPreview && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label">マージプレビュー</label>
              <button className="btn btn-sm" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div className="diff-raw" style={{ maxHeight: 400 }}>
              {preview.split('\n').map((line, i) => {
                let className = '';
                if (line.startsWith('A') || line.startsWith('U')) className = 'diff-line-add';
                else if (line.startsWith('D')) className = 'diff-line-del';
                else if (line.startsWith('C') || line.startsWith('G')) className = 'diff-line-info';
                return <div key={i} className={className}>{line || ' '}</div>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
