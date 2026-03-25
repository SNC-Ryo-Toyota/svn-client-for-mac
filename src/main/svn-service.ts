import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface SvnStatusEntry {
  status: string;
  path: string;
}

export interface SvnLogEntry {
  revision: string;
  author: string;
  date: string;
  message: string;
}

export interface SvnListEntry {
  kind: 'file' | 'dir';
  name: string;
  size: string;
  revision: string;
  author: string;
  date: string;
}

export interface SvnInfo {
  url: string;
  repositoryRoot: string;
  repositoryUuid: string;
  revision: string;
  nodeKind: string;
  lastChangedAuthor: string;
  lastChangedRev: string;
  lastChangedDate: string;
  wcRootPath?: string;
}

function parseSvnXml(xml: string): Document {
  const { DOMParser } = require('@xmldom/xmldom');
  const parser = new DOMParser();
  return parser.parseFromString(xml, 'text/xml');
}

export class SvnService {
  private svnPath: string = 'svn';

  private async exec(args: string[], cwd?: string): Promise<string> {
    const options: any = { maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8' };
    if (cwd) options.cwd = cwd;
    const { stdout } = await execFileAsync(this.svnPath, args, options);
    return String(stdout);
  }

  async info(target: string): Promise<SvnInfo> {
    const output = await this.exec(['info', '--xml', target]);
    const doc = parseSvnXml(output);
    const entry = doc.getElementsByTagName('entry')[0];
    const getTextContent = (parent: any, tag: string): string => {
      const elements = parent.getElementsByTagName(tag);
      return elements.length > 0 ? (elements[0].textContent || '') : '';
    };
    return {
      url: getTextContent(entry, 'url'),
      repositoryRoot: getTextContent(doc.getElementsByTagName('repository')[0], 'root'),
      repositoryUuid: getTextContent(doc.getElementsByTagName('repository')[0], 'uuid'),
      revision: entry?.getAttribute('revision') || '',
      nodeKind: entry?.getAttribute('kind') || '',
      lastChangedAuthor: getTextContent(doc.getElementsByTagName('commit')[0], 'author'),
      lastChangedRev: doc.getElementsByTagName('commit')[0]?.getAttribute('revision') || '',
      lastChangedDate: getTextContent(doc.getElementsByTagName('commit')[0], 'date'),
      wcRootPath: getTextContent(entry, 'wc-info') ? getTextContent(doc.getElementsByTagName('wc-info')[0], 'wcroot-abspath') : undefined,
    };
  }

  async list(url: string): Promise<SvnListEntry[]> {
    const output = await this.exec(['list', '--xml', url]);
    const doc = parseSvnXml(output);
    const entries = doc.getElementsByTagName('entry');
    const result: SvnListEntry[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const getTextContent = (parent: any, tag: string): string => {
        const elements = parent.getElementsByTagName(tag);
        return elements.length > 0 ? (elements[0].textContent || '') : '';
      };
      result.push({
        kind: entry.getAttribute('kind') as 'file' | 'dir',
        name: getTextContent(entry, 'name'),
        size: getTextContent(entry, 'size'),
        revision: getTextContent(doc.getElementsByTagName('commit')[i], 'revision') || entry.getElementsByTagName('commit')[0]?.getAttribute('revision') || '',
        author: getTextContent(entry.getElementsByTagName('commit')[0], 'author'),
        date: getTextContent(entry.getElementsByTagName('commit')[0], 'date'),
      });
    }
    return result;
  }

  async status(wcPath: string): Promise<SvnStatusEntry[]> {
    const output = await this.exec(['status', '--xml', wcPath]);
    const doc = parseSvnXml(output);
    const entries = doc.getElementsByTagName('entry');
    const result: SvnStatusEntry[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const path = entry.getAttribute('path') || '';
      const wcStatus = entry.getElementsByTagName('wc-status')[0];
      const status = wcStatus?.getAttribute('item') || 'normal';
      if (status !== 'normal' && status !== 'none') {
        result.push({ status, path });
      }
    }
    return result;
  }

  async diff(wcPath: string, filePath?: string): Promise<string> {
    const args = ['diff'];
    if (filePath) {
      args.push(filePath);
    }
    return this.exec(args, wcPath);
  }

  async diffRevisions(target: string, rev1: string, rev2: string): Promise<string> {
    return this.exec(['diff', '-r', `${rev1}:${rev2}`, target]);
  }

  async log(target: string, limit: number = 50): Promise<SvnLogEntry[]> {
    const output = await this.exec(['log', '--xml', '-l', limit.toString(), target]);
    const doc = parseSvnXml(output);
    const entries = doc.getElementsByTagName('logentry');
    const result: SvnLogEntry[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const getTextContent = (parent: any, tag: string): string => {
        const elements = parent.getElementsByTagName(tag);
        return elements.length > 0 ? (elements[0].textContent || '') : '';
      };
      result.push({
        revision: entry.getAttribute('revision') || '',
        author: getTextContent(entry, 'author'),
        date: getTextContent(entry, 'date'),
        message: getTextContent(entry, 'msg'),
      });
    }
    return result;
  }

  async commit(wcPath: string, message: string, files?: string[]): Promise<string> {
    const args = ['commit', '-m', message];
    if (files && files.length > 0) {
      args.push(...files);
    }
    return this.exec(args, wcPath);
  }

  async revert(wcPath: string, files: string[]): Promise<string> {
    return this.exec(['revert', ...files], wcPath);
  }

  async add(wcPath: string, files: string[]): Promise<string> {
    return this.exec(['add', ...files], wcPath);
  }

  async remove(wcPath: string, files: string[]): Promise<string> {
    return this.exec(['rm', ...files], wcPath);
  }

  async update(wcPath: string): Promise<string> {
    return this.exec(['update', wcPath]);
  }

  async merge(wcPath: string, sourceUrl: string, revisions?: string): Promise<string> {
    const args = ['merge'];
    if (revisions) {
      args.push('-c', revisions);
    }
    args.push(sourceUrl);
    return this.exec(args, wcPath);
  }

  async mergeRange(wcPath: string, sourceUrl: string, startRev: string, endRev: string): Promise<string> {
    return this.exec(['merge', '-r', `${startRev}:${endRev}`, sourceUrl], wcPath);
  }

  async mergeDryRun(wcPath: string, sourceUrl: string, revisions?: string): Promise<string> {
    const args = ['merge', '--dry-run'];
    if (revisions) {
      args.push('-c', revisions);
    }
    args.push(sourceUrl);
    return this.exec(args, wcPath);
  }

  async branches(repoRoot: string): Promise<SvnListEntry[]> {
    try {
      return await this.list(repoRoot + '/branches');
    } catch {
      return [];
    }
  }

  async tags(repoRoot: string): Promise<SvnListEntry[]> {
    try {
      return await this.list(repoRoot + '/tags');
    } catch {
      return [];
    }
  }

  async cat(url: string, revision?: string): Promise<string> {
    const args = ['cat'];
    if (revision) {
      args.push('-r', revision);
    }
    args.push(url);
    return this.exec(args);
  }

  async checkout(url: string, destPath: string): Promise<string> {
    return this.exec(['checkout', url, destPath]);
  }

  async mergeinfo(wcPath: string, sourceUrl: string): Promise<string> {
    try {
      return await this.exec(['mergeinfo', '--show-revs', 'eligible', sourceUrl], wcPath);
    } catch {
      return '';
    }
  }

  async resolve(wcPath: string, filePath: string, accept: string = 'working'): Promise<string> {
    return this.exec(['resolve', '--accept', accept, filePath], wcPath);
  }

  async cleanup(wcPath: string): Promise<string> {
    return this.exec(['cleanup', wcPath]);
  }
}
