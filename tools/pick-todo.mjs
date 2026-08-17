#!/usr/bin/env node
// 打印下一档可执行的自动化队列项（供人工或 agent 启动时确认）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'AUTOMATION_QUEUE.md'), 'utf8');

const blocks = md.split(/^### /m).slice(1).map((b) => {
  const lines = b.trim().split('\n');
  const title = lines[0].trim();
  const id = title.match(/^(A\d+)/)?.[1];
  const fields = {};
  for (const line of lines) {
    const m = line.match(/^- \*\*(\w+)\*\*:\s*(.+)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  return { id, title, ...fields };
});

const open = blocks.filter((b) => b.status === 'open');
const rank = (p) => (p === 'P1' ? 1 : p === 'P2' ? 2 : 9);
open.sort((a, b) => rank(a.priority) - rank(b.priority));

const doneIds = new Set(blocks.filter((b) => b.status === 'done').map((b) => b.id));
const pick = open.find((b) => {
  if (!b.depends) return true;
  const deps = [...b.depends.matchAll(/A\d+/g)].map((m) => m[0]);
  // 「至少一项」类 depends：任一完成即可；「A6」硬依赖：必须完成
  if (/至少/.test(b.depends)) return deps.some((d) => doneIds.has(d));
  return deps.every((d) => doneIds.has(d));
});

if (!pick) {
  console.log('QUEUE_EMPTY');
  process.exit(0);
}
console.log(`${pick.id}\t${pick.priority}\t${pick.title}`);
