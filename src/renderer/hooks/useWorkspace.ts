import { useState, useCallback } from 'react';

export type View = 'browse' | 'changes' | 'log' | 'merge';

export interface WorkspaceState {
  wcPath: string | null;
  repoUrl: string | null;
  repoRoot: string | null;
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    wcPath: null,
    repoUrl: null,
    repoRoot: null,
  });
  const [currentView, setCurrentView] = useState<View>('browse');

  const openWorkingCopy = useCallback(async () => {
    const dir = await window.dialog.openDirectory();
    if (!dir) return;
    try {
      const info = await window.svn.info(dir);
      setWorkspace({
        wcPath: dir,
        repoUrl: info.url,
        repoRoot: info.repositoryRoot,
      });
      setCurrentView('changes');
    } catch (err: any) {
      throw new Error('選択されたディレクトリはSVN作業コピーではありません: ' + (err.message || err));
    }
  }, []);

  const openRepositoryUrl = useCallback(async (url: string) => {
    console.log('[useWorkspace] openRepositoryUrl called:', url);
    try {
      const info = await window.svn.info(url);
      console.log('[useWorkspace] svn info result:', JSON.stringify(info));
      setWorkspace(prev => {
        const next = {
          ...prev,
          repoUrl: url,
          repoRoot: info.repositoryRoot,
        };
        console.log('[useWorkspace] setWorkspace:', JSON.stringify(next));
        return next;
      });
      setCurrentView('browse');
    } catch (err: any) {
      console.error('[useWorkspace] openRepositoryUrl error:', err);
      throw new Error('リポジトリに接続できません: ' + (err.message || err));
    }
  }, []);

  return {
    workspace,
    currentView,
    setCurrentView,
    openWorkingCopy,
    openRepositoryUrl,
  };
}
