import { useState, useEffect, useCallback } from 'react';

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

export function RepositoryBrowser({ repoUrl, repoRoot, wcPath, onError, onInfo }: BrowserProps) {
  const [currentUrl, setCurrentUrl] = useState<string>(repoUrl || '');
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(!repoUrl);

  useEffect(() => {
    if (repoUrl && !currentUrl) {
      setCurrentUrl(repoUrl);
    }
  }, [repoUrl]);

  const browse = useCallback(async (url: string) => {
    setLoading(true);
    try {
      const result = await window.svn.list(url);
      setEntries(result);
      setCurrentUrl(url);
      setShowUrlInput(false);
    } catch (err: any) {
      onError('ブラウズ失敗: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    if (currentUrl) {
      browse(currentUrl);
    }
  }, []);

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
    <div className="panel">
      <div className="panel-header">
        <h2>リポジトリブラウザ</h2>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={() => setShowUrlInput(true)}>
          URL変更
        </button>
        <button className="btn btn-sm" onClick={() => browse(currentUrl)}>
          🔄 更新
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

      <div className="panel-body">
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
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
