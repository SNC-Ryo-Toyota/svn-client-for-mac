import { useState } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { RepositoryBrowser } from './components/RepositoryBrowser.tsx';
import { ChangesView } from './components/ChangesView.tsx';
import { LogView } from './components/LogView.tsx';
import { MergeView } from './components/MergeView.tsx';
import { WelcomeView } from './components/WelcomeView.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { useToast } from './hooks/useToast.ts';
import { useWorkspace, type View } from './hooks/useWorkspace.ts';

export default function App() {
  const { toasts, success, error, info } = useToast();
  const { workspace, currentView, setCurrentView, openWorkingCopy, openRepositoryUrl } = useWorkspace();
  const [changesCount, setChangesCount] = useState(0);

  const hasWorkspace = workspace.wcPath || workspace.repoUrl;

  console.log('[App] render — workspace:', JSON.stringify(workspace), 'currentView:', currentView, 'hasWorkspace:', hasWorkspace);

  const renderView = () => {
    if (!hasWorkspace) {
      return (
        <WelcomeView
          onOpenWorkingCopy={openWorkingCopy}
          onOpenRepoUrl={openRepositoryUrl}
          onError={error}
        />
      );
    }

    switch (currentView) {
      case 'browse':
        return (
          <RepositoryBrowser
            repoUrl={workspace.repoUrl}
            repoRoot={workspace.repoRoot}
            wcPath={workspace.wcPath}
            onError={error}
            onInfo={info}
          />
        );
      case 'changes':
        if (!workspace.wcPath) {
          return (
            <div className="panel">
              <div className="panel-body">
                <div className="empty-state">
                  <div className="icon">📁</div>
                  <div>作業コピーを開いてください</div>
                  <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={async () => {
                    try { await openWorkingCopy(); } catch (e: any) { error(e.message); }
                  }}>
                    作業コピーを開く
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return (
          <ChangesView
            wcPath={workspace.wcPath}
            onError={error}
            onSuccess={success}
            onStatusChange={setChangesCount}
          />
        );
      case 'log':
        return (
          <LogView
            target={workspace.wcPath || workspace.repoUrl!}
            onError={error}
          />
        );
      case 'merge':
        if (!workspace.wcPath || !workspace.repoRoot || !workspace.repoUrl) {
          return (
            <div className="panel">
              <div className="panel-body">
                <div className="empty-state">
                  <div className="icon">🔀</div>
                  <div>マージするには作業コピーを開いてください</div>
                </div>
              </div>
            </div>
          );
        }
        return (
          <MergeView
            wcPath={workspace.wcPath}
            repoRoot={workspace.repoRoot}
            repoUrl={workspace.repoUrl}
            onError={error}
            onSuccess={success}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      <div className="titlebar">
        <span className="titlebar-title">SVN Client</span>
        {workspace.wcPath && (
          <span className="titlebar-path">{workspace.wcPath}</span>
        )}
        <div className="titlebar-actions">
          <button className="btn btn-sm" onClick={async () => {
            try { await openWorkingCopy(); } catch (e: any) { error(e.message); }
          }}>
            📁 作業コピーを開く
          </button>
        </div>
      </div>

      <div className="main-content">
        {hasWorkspace && (
          <Sidebar
            currentView={currentView}
            onViewChange={(v: View) => setCurrentView(v)}
            changesCount={changesCount}
            hasWorkingCopy={!!workspace.wcPath}
          />
        )}
        {renderView()}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
