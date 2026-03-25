import { ipcMain, dialog, shell } from 'electron';
import { SvnService } from './svn-service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const svn = new SvnService();

export function registerIpcHandlers(): void {
  ipcMain.handle('svn:info', async (_event, target: string) => {
    return svn.info(target);
  });

  ipcMain.handle('svn:list', async (_event, url: string) => {
    return svn.list(url);
  });

  ipcMain.handle('svn:status', async (_event, wcPath: string) => {
    return svn.status(wcPath);
  });

  ipcMain.handle('svn:diff', async (_event, wcPath: string, filePath?: string) => {
    return svn.diff(wcPath, filePath);
  });

  ipcMain.handle('svn:diffRevisions', async (_event, target: string, rev1: string, rev2: string) => {
    return svn.diffRevisions(target, rev1, rev2);
  });

  ipcMain.handle('svn:log', async (_event, target: string, limit?: number) => {
    return svn.log(target, limit);
  });

  ipcMain.handle('svn:commit', async (_event, wcPath: string, message: string, files?: string[]) => {
    return svn.commit(wcPath, message, files);
  });

  ipcMain.handle('svn:revert', async (_event, wcPath: string, files: string[]) => {
    return svn.revert(wcPath, files);
  });

  ipcMain.handle('svn:add', async (_event, wcPath: string, files: string[]) => {
    return svn.add(wcPath, files);
  });

  ipcMain.handle('svn:remove', async (_event, wcPath: string, files: string[]) => {
    return svn.remove(wcPath, files);
  });

  ipcMain.handle('svn:update', async (_event, wcPath: string) => {
    return svn.update(wcPath);
  });

  ipcMain.handle('svn:merge', async (_event, wcPath: string, sourceUrl: string, revisions?: string) => {
    return svn.merge(wcPath, sourceUrl, revisions);
  });

  ipcMain.handle('svn:mergeRange', async (_event, wcPath: string, sourceUrl: string, startRev: string, endRev: string) => {
    return svn.mergeRange(wcPath, sourceUrl, startRev, endRev);
  });

  ipcMain.handle('svn:mergeDryRun', async (_event, wcPath: string, sourceUrl: string, revisions?: string) => {
    return svn.mergeDryRun(wcPath, sourceUrl, revisions);
  });

  ipcMain.handle('svn:branches', async (_event, repoRoot: string) => {
    return svn.branches(repoRoot);
  });

  ipcMain.handle('svn:tags', async (_event, repoRoot: string) => {
    return svn.tags(repoRoot);
  });

  ipcMain.handle('svn:cat', async (_event, url: string, revision?: string) => {
    return svn.cat(url, revision);
  });

  ipcMain.handle('svn:mergeinfo', async (_event, wcPath: string, sourceUrl: string) => {
    return svn.mergeinfo(wcPath, sourceUrl);
  });

  ipcMain.handle('svn:resolve', async (_event, wcPath: string, filePath: string, accept?: string) => {
    return svn.resolve(wcPath, filePath, accept);
  });

  ipcMain.handle('svn:cleanup', async (_event, wcPath: string) => {
    return svn.cleanup(wcPath);
  });

  // Dialog handlers
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'SVN作業コピーを選択',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:openRepositoryUrl', async () => {
    // This will be handled via a custom dialog in the renderer
    return null;
  });

  // File operations
  ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
    return shell.openPath(filePath);
  });

  ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  ipcMain.handle('file:openInEditor', async (_event, url: string, revision?: string) => {
    const content = await svn.cat(url, revision);
    const fileName = path.basename(url);
    const tmpDir = path.join(os.tmpdir(), 'svn-client');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const tmpFile = path.join(tmpDir, `r${revision || 'HEAD'}_${fileName}`);
    fs.writeFileSync(tmpFile, content, 'utf-8');
    return shell.openPath(tmpFile);
  });
}
