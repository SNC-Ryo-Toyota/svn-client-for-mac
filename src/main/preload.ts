import { contextBridge, ipcRenderer } from 'electron';

const svnApi = {
  info: (target: string) => ipcRenderer.invoke('svn:info', target),
  list: (url: string) => ipcRenderer.invoke('svn:list', url),
  status: (wcPath: string) => ipcRenderer.invoke('svn:status', wcPath),
  diff: (wcPath: string, filePath?: string) => ipcRenderer.invoke('svn:diff', wcPath, filePath),
  diffRevisions: (target: string, rev1: string, rev2: string) => ipcRenderer.invoke('svn:diffRevisions', target, rev1, rev2),
  log: (target: string, limit?: number) => ipcRenderer.invoke('svn:log', target, limit),
  commit: (wcPath: string, message: string, files?: string[]) => ipcRenderer.invoke('svn:commit', wcPath, message, files),
  revert: (wcPath: string, files: string[]) => ipcRenderer.invoke('svn:revert', wcPath, files),
  add: (wcPath: string, files: string[]) => ipcRenderer.invoke('svn:add', wcPath, files),
  remove: (wcPath: string, files: string[]) => ipcRenderer.invoke('svn:remove', wcPath, files),
  update: (wcPath: string) => ipcRenderer.invoke('svn:update', wcPath),
  merge: (wcPath: string, sourceUrl: string, revisions?: string) => ipcRenderer.invoke('svn:merge', wcPath, sourceUrl, revisions),
  mergeRange: (wcPath: string, sourceUrl: string, startRev: string, endRev: string) => ipcRenderer.invoke('svn:mergeRange', wcPath, sourceUrl, startRev, endRev),
  mergeDryRun: (wcPath: string, sourceUrl: string, revisions?: string) => ipcRenderer.invoke('svn:mergeDryRun', wcPath, sourceUrl, revisions),
  branches: (repoRoot: string) => ipcRenderer.invoke('svn:branches', repoRoot),
  tags: (repoRoot: string) => ipcRenderer.invoke('svn:tags', repoRoot),
  cat: (url: string, revision?: string) => ipcRenderer.invoke('svn:cat', url, revision),
  mergeinfo: (wcPath: string, sourceUrl: string) => ipcRenderer.invoke('svn:mergeinfo', wcPath, sourceUrl),
  resolve: (wcPath: string, filePath: string, accept?: string) => ipcRenderer.invoke('svn:resolve', wcPath, filePath, accept),
  cleanup: (wcPath: string) => ipcRenderer.invoke('svn:cleanup', wcPath),
};

const dialogApi = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
};

const shellApi = {
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  openInEditor: (url: string, revision?: string) => ipcRenderer.invoke('file:openInEditor', url, revision),
};

contextBridge.exposeInMainWorld('svn', svnApi);
contextBridge.exposeInMainWorld('dialog', dialogApi);
contextBridge.exposeInMainWorld('shell', shellApi);
