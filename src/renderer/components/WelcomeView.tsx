import { useState, useCallback } from 'react';

interface WelcomeProps {
  onOpenWorkingCopy: () => Promise<void>;
  onOpenRepoUrl: (url: string) => Promise<void>;
  onError: (msg: string) => void;
}

export function WelcomeView({ onOpenWorkingCopy, onOpenRepoUrl, onError }: WelcomeProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleOpenWc = useCallback(async () => {
    try {
      await onOpenWorkingCopy();
    } catch (err: any) {
      onError(err.message || String(err));
    }
  }, [onOpenWorkingCopy, onError]);

  const handleConnect = useCallback(async () => {
    if (!repoUrl.trim()) return;
    setConnecting(true);
    try {
      await onOpenRepoUrl(repoUrl.trim());
    } catch (err: any) {
      onError(err.message || String(err));
    } finally {
      setConnecting(false);
    }
  }, [repoUrl, onOpenRepoUrl, onError]);

  return (
    <div className="panel">
      <div className="panel-body">
        <div className="welcome">
          <div style={{ fontSize: 72, opacity: 0.4 }}>🐢</div>
          <h2>SVN Client</h2>
          <p>
            SVNリポジトリのブラウジング、変更の確認・コミット・リバート、
            ブランチのマージを行えるクライアントです。
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleOpenWc} style={{ padding: '10px 24px' }}>
              📁 作業コピーを開く
            </button>
          </div>

          <div style={{ width: '100%', maxWidth: 500, marginTop: 24 }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
              または
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input input-mono"
                placeholder="リポジトリURL (svn://... or https://...)"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleConnect();
                }}
              />
              <button className="btn" onClick={handleConnect} disabled={connecting || !repoUrl.trim()}>
                {connecting ? '接続中...' : '接続'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
