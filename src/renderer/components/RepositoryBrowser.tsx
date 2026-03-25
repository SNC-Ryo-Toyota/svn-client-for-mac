import { useState, useEffect, useCallback, useRef } from 'react';

interface BrowserProps {
  repoUrl: string | null;
  repoRoot: string | null;
  wcPath: string | null;
  onError: (msg: string) => void;
  onInfo: (msg: string) => void;
}

interface ListEntry {
  kind: 'file' | 'dir';
  name: string;
  size: string;
  revision: string;
  author: string;
  date: string;
}

interface LogEntry {
  revision: string;
  author: string;
  date: string;
  message: string;
}

export function RepositoryBrowser({ repoUrl, repoRoot, wcPath, onError, onInfo }: BrowserProps) {
  console.log('[RepositoryBrowser] render — repoUrl:', repoUrl, 'repoRoot:', repoRoot, 'wcPath:', wcPath);
  const [currentUrl, setCurrentUrl] = useState<string>(repoUrl || '');
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(!repoUrl);
  const historyStack = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const isNavigatingHistory = useRef(false);

  // Log panel state
  const [logTarget, setLogTarget] = useState<string | null>(null);
  const [logTargetLabel, setLogTargetLabel] = useState('');
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logLimit, setLogLimit] = useState(50);
  const [logSelectedRev, setLogSelectedRev] = useState<string | null>(null);
  const [logDiff, setLogDiff] = useState('');
  const [logDiffLoading, setLogDiffLoading] = useState(false);

  const browse = useCallback(async (url: string, skipHistory = false) => {
    console.log('[RepositoryBrowser] browse called:', url, 'skipHistory:', skipHistory);
    setLoading(true);
    try {
      const result = await window.svn.list(url);
      console.log('[RepositoryBrowser] svn list result:', result?.length, 'entries');
      setEntries(result);
      setCurrentUrl(url);
      setShowUrlInput(false);
      if (!skipHistory && !isNavigatingHistory.current) {
        const stack = historyStack.current;
        const idx = historyIndex.current;
        historyStack.current = [...stack.slice(0, idx + 1), url];
        historyIndex.current = historyStack.current.length - 1;
      }
      isNavigatingHistory.current = false;
    } catch (err: any) {
      onError('ブラウズ失敗: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // repoUrl prop が変わったら（初回マウント含む）自動でブラウズ開始
  useEffect(() => {
    console.log('[RepositoryBrowser] useEffect[repoUrl] fired — repoUrl:', repoUrl);
    if (repoUrl) {
      browse(repoUrl);
    }
  }, [repoUrl]);

  const goBack = useCallback(() => {
    if (historyIndex.current > 0) {
      isNavigatingHistory.current = true;
      historyIndex.current--;
      browse(historyStack.current[historyIndex.current], true);
    }
  }, [browse]);

  const goForward = useCallback(() => {
    if (historyIndex.current < historyStack.current.length - 1) {
      isNavigatingHistory.current = true;
      historyIndex.current++;
      browse(historyStack.current[historyIndex.current], true);
    }
  }, [browse]);

  useEffect(() => {
    const cleanup = window.appNav.onSwipe((direction: string) => {
      if (direction === 'right') goBack();
      else if (direction === 'left') goForward();
    });
    return cleanup;
  }, [goBack, goForward]);

  const navigateTo = (entry: ListEntry) => {
    if (entry.kind === 'dir') {
      browse(currentUrl + '/' + entry.name);
    }
  };

  const navigateUp = () => {
    if (!currentUrl || currentUrl === repoRoot) return;
    const parent = currentUrl.replace(/\/[^/]+\/?$/, '');
    if (parent) browse(parent);
  };

  const openFile = async (entry: ListEntry) => {
    if (entry.kind === 'file') {
      try {
        await window.shell.openInEditor(currentUrl + '/' + entry.name);
        onInfo(`${entry.name} を開きました`);
      } catch (err: any) {
        onError('ファイルを開けません: ' + (err.message || err));
      }
    }
  };

  const breadcrumbParts = () => {
    if (!currentUrl || !repoRoot) return [];
    const relative = currentUrl.replace(repoRoot, '');
    const parts = relative.split('/').filter(Boolean);
    const result: { label: string; url: string }[] = [
      { label: repoRoot.split('/').pop() || 'root', url: repoRoot },
    ];
    let acc = repoRoot;
    for (const part of parts) {
      acc += '/' + part;
      result.push({ label: part, url: acc });
    }
    return result;
  };

  const formatSize = (size: string) => {
    const n = parseInt(size, 10);
    if (!n || isNaN(n)) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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

  const showLog = useCallback(async (url: string, label: string) => {
    setLogTarget(url);
    setLogTargetLabel(label);
    setLogEntries([]);
    setLogSelectedRev(null);
    setLogDiff('');
    setLogLoading(true);
    try {
      const result = await window.svn.log(url, logLimit);
      setLogEntries(result);
    } catch (err: any) {
      onError('ログ取得失敗: ' + (err.message || err));
    } finally {
      setLogLoading(false);
    }
  }, [logLimit, onError]);

  const refreshLog = useCallback(async () => {
    if (!logTarget) return;
    setLogLoading(true);
    try {
      const result = await window.svn.log(logTarget, logLimit);
      setLogEntries(result);
    } catch (err: any) {
      onError('ログ取得失敗: ' + (err.message || err));
    } finally {
      setLogLoading(false);
    }
  }, [logTarget, logLimit, onError]);

  useEffect(() => {
    if (logTarget) refreshLog();
  }, [logLimit]);

  const showLogRevDiff = async (rev: string) => {
    if (!logTarget) return;
    setLogSelectedRev(rev);
    setLogDiffLoading(true);
    try {
      const prevRev = (parseInt(rev) - 1).toString();
      const d = await window.svn.diffRevisions(logTarget, prevRev, rev);
      setLogDiff(d);
    } catch (err: any) {
      setLogDiff('差分取得失敗: ' + (err.message || err));
    } finally {
      setLogDiffLoading(false);
    }
  };

  const closeLog = () => {
    setLogTarget(null);
    setLogTargetLabel('');
    setLogEntries([]);
    setLogSelectedRev(null);
    setLogDiff('');
  };

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

  if (showUrlInput) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2>リポジトリブラウザ</h2>
        </div>
        <div className="panel-body">
          <div className="welcome">
            <div className="welcome-icon">🌐</div>
            <h2>リポジトリURLを入力</h2>
            <p>SVNリポジトリのURLを入力してブラウズを開始します</p>
            <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 500 }}>
              <input
                className="input input-mono"
                placeholder="svn://... or https://..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && urlInput.trim()) browse(urlInput.trim());
                }}
              />
              <button className="btn btn-primary" onClick={() => urlInput.trim() && browse(urlInput.trim())}>
                接続
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <h2>リポジトリブラウザ</h2>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={goBack} disabled={historyIndex.current <= 0} title="戻る">
          ◀
        </button>
        <button className="btn btn-sm" onClick={goForward} disabled={historyIndex.current >= historyStack.current.length - 1} title="進む">
          ▶
        </button>
        <button className="btn btn-sm" onClick={() => setShowUrlInput(true)}>
          URL変更
        </button>
        <button className="btn btn-sm" onClick={() => browse(currentUrl)}>
          🔄 更新
        </button>
        <button className="btn btn-sm" onClick={() => showLog(currentUrl, currentUrl.split('/').pop() || 'root')} title="このディレクトリのログ">
          📋 ログ
        </button>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div className="breadcrumb">
          {breadcrumbParts().map((part, i, arr) => (
            <span key={part.url}>
              <span
                className="breadcrumb-item"
                onClick={() => browse(part.url)}
                style={i === arr.length - 1 ? { color: 'var(--text-primary)', fontWeight: 600 } : {}}
              >
                {part.label}
              </span>
              {i < arr.length - 1 && <span className="breadcrumb-sep"> / </span>}
            </span>
          ))}
        </div>
      </div>

      <div className="panel-body" style={{ flex: logTarget ? undefined : 1, maxHeight: logTarget ? '40%' : undefined, minHeight: logTarget ? 120 : undefined }}>
        {loading ? (
          <div className="loading"><div className="spinner" /> 読み込み中...</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <div>空のディレクトリです</div>
          </div>
        ) : (
          <div className="file-tree">
            {currentUrl !== repoRoot && (
              <div className="file-tree-item" onClick={navigateUp}>
                <span className="icon">⬆️</span>
                <span className="name" style={{ color: 'var(--text-muted)' }}>..</span>
              </div>
            )}
            {entries
              .sort((a, b) => {
                if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .map(entry => (
                <div
                  key={entry.name}
                  className="file-tree-item"
                  onClick={() => entry.kind === 'dir' ? navigateTo(entry) : openFile(entry)}
                  onDoubleClick={() => openFile(entry)}
                >
                  <span className="icon">{entry.kind === 'dir' ? '📁' : '📄'}</span>
                  <span className="name">{entry.name}</span>
                  <span className="meta">{formatSize(entry.size)}</span>
                  <span className="meta">{entry.author}</span>
                  <span className="meta">{formatDate(entry.date)}</span>
                  <span className="meta" style={{ color: 'var(--accent)' }}>r{entry.revision}</span>
                  <button
                    className="btn btn-sm btn-log-inline"
                    title={`${entry.name} のログを表示`}
                    onClick={(e) => {
                      e.stopPropagation();
                      showLog(currentUrl + '/' + entry.name, entry.name);
                    }}
                  >
                    📋
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Inline log panel */}
      {logTarget && (
        <div className="browser-log-panel">
          <div className="browser-log-header">
            <span className="browser-log-title">📋 {logTargetLabel} のログ</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {logTarget}
            </span>
            <select className="input" style={{ width: 80, fontSize: 11 }} value={logLimit} onChange={e => setLogLimit(Number(e.target.value))}>
              <option value={25}>25件</option>
              <option value={50}>50件</option>
              <option value={100}>100件</option>
              <option value={200}>200件</option>
            </select>
            <button className="btn btn-sm" onClick={refreshLog}>🔄</button>
            <button className="btn btn-sm" onClick={closeLog}>✕</button>
          </div>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{ width: logSelectedRev ? '50%' : '100%', overflow: 'auto', transition: 'width 0.2s ease' }}>
              {logLoading ? (
                <div className="loading"><div className="spinner" /> 読み込み中...</div>
              ) : logEntries.length === 0 ? (
                <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>ログがありません</div>
              ) : (
                <table className="log-table">
                  <thead>
                    <tr>
                      <th>Rev</th>
                      <th>Author</th>
                      <th>日時</th>
                      <th>メッセージ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logEntries.map(entry => (
                      <tr
                        key={entry.revision}
                        onClick={() => showLogRevDiff(entry.revision)}
                        style={logSelectedRev === entry.revision ? { background: 'var(--bg-surface)' } : { cursor: 'pointer' }}
                      >
                        <td className="rev">r{entry.revision}</td>
                        <td className="author">{entry.author}</td>
                        <td className="date">{formatDate(entry.date)}</td>
                        <td className="message" title={entry.message}>{entry.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {logSelectedRev && (
              <div style={{ flex: 1, borderLeft: '1px solid var(--border)', overflow: 'auto', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>r{logSelectedRev} の変更</span>
                  <button className="btn btn-sm" onClick={() => { setLogSelectedRev(null); setLogDiff(''); }}>✕</button>
                </div>
                {logDiffLoading ? (
                  <div className="loading"><div className="spinner" /> 差分読込中...</div>
                ) : (
                  <div className="diff-raw">{renderDiffLines(logDiff)}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
