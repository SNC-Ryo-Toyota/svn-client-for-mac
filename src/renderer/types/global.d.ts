export {};

declare global {
  interface Window {
    svn: {
      info: (target: string) => Promise<any>;
      list: (url: string) => Promise<any[]>;
      status: (wcPath: string) => Promise<any[]>;
      diff: (wcPath: string, filePath?: string) => Promise<string>;
      diffRevisions: (target: string, rev1: string, rev2: string) => Promise<string>;
      log: (target: string, limit?: number) => Promise<any[]>;
      commit: (wcPath: string, message: string, files?: string[]) => Promise<string>;
      revert: (wcPath: string, files: string[]) => Promise<string>;
      add: (wcPath: string, files: string[]) => Promise<string>;
      remove: (wcPath: string, files: string[]) => Promise<string>;
      update: (wcPath: string) => Promise<string>;
      merge: (wcPath: string, sourceUrl: string, revisions?: string) => Promise<string>;
      mergeRange: (wcPath: string, sourceUrl: string, startRev: string, endRev: string) => Promise<string>;
      mergeDryRun: (wcPath: string, sourceUrl: string, revisions?: string) => Promise<string>;
      branches: (repoRoot: string) => Promise<any[]>;
      tags: (repoRoot: string) => Promise<any[]>;
      cat: (url: string, revision?: string) => Promise<string>;
      mergeinfo: (wcPath: string, sourceUrl: string) => Promise<string>;
      resolve: (wcPath: string, filePath: string, accept?: string) => Promise<string>;
      cleanup: (wcPath: string) => Promise<string>;
    };
    dialog: {
      openDirectory: () => Promise<string | null>;
    };
    shell: {
      openPath: (filePath: string) => Promise<string>;
      showItemInFolder: (filePath: string) => Promise<void>;
      openInEditor: (url: string, revision?: string) => Promise<string>;
    };
  }
}
