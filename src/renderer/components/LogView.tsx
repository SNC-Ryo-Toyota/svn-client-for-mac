import { useState, useEffect, useCallback } from 'react';

interface LogViewProps {
  target: string;
  onError: (msg: string) => void;
}

interface LogEntry {
  revision: string;
  author: string;
  date: string;
  message: string;
}

export function LogView({ target, onError }: LogViewProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [selectedRev, setSelectedRev] = useState<string | null>(null);
  const [diff, setDiff] = useState<string>('');
  const [diffLoading, setDiffLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.svn.log(target, limit);
      setEntries(result);
    } catch (err: any) {
      onError('ログ取得失敗: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, [target, limit, onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showRevDiff = async (rev: string) => {
    setSelectedRev(rev);
    setDiffLoading(true);
    try {
      const prevRev = (parseInt(rev) - 1).toString();
      const d = await window.svn.diffRevisions(target, prevRev, rev);
      setDiff(d);
    } catch (err: any) {
      setDiff('差分取得失敗: ' + (err.message || err));
    } finally {
      setDiffLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
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

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <h2>ログ</h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {target}
        </span>
        <div style={{ flex: 1 }} />
        <select className="input" style={{ width: 100 }} value={limit} onChange={e => setLimit(Number(e.target.value))}>
          <option value={25}>25件</option>
          <option value={50}>50件</option>
          <option value={100}>100件</option>
          <option value={200}>200件</option>
        </select>
        <button className="btn btn-sm" onClick={refresh}>🔄 更新</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Log table */}
        <div style={{ width: selectedRev ? '50%' : '100%', overflow: 'auto', transition: 'width 0.2s ease' }}>
          {loading ? (
            <div className="loading"><div className="spinner" /> 読み込み中...</div>
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
                {entries.map(entry => (
                  <tr
                    key={entry.revision}
                    onClick={() => showRevDiff(entry.revision)}
                    style={selectedRev === entry.revision ? { background: 'var(--bg-surface)' } : { cursor: 'pointer' }}
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

        {/* Rev diff panel */}
        {selectedRev && (
          <div style={{ flex: 1, borderLeft: '1px solid var(--border)', overflow: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>r{selectedRev} の変更</span>
              <button className="btn btn-sm" onClick={() => { setSelectedRev(null); setDiff(''); }}>✕</button>
            </div>
            {diffLoading ? (
              <div className="loading"><div className="spinner" /> 差分読込中...</div>
            ) : (
              <div className="diff-raw">{renderDiffLines(diff)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
