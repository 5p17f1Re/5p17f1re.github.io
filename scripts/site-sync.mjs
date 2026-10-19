import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const mode = process.argv[2] ?? 'check';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const fail = (message) => { throw new Error(message); };
const branch = () => git('branch', '--show-current');
const dirty = () => git('status', '--porcelain', '--untracked-files=normal');
const ancestor = (base, tip) => {
  try { git('merge-base', '--is-ancestor', base, tip); return true; }
  catch (error) { if (error.status === 1) return false; throw error; }
};
const fetchMain = () => git('fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main');

try {
  if (mode === 'pre-push') {
    const updates = readFileSync(0, 'utf8').trim().split('\n').filter(Boolean);
    for (const update of updates) {
      const [localRef, localSha, remoteRef, remoteSha] = update.split(/\s+/);
      if (remoteRef !== 'refs/heads/main') continue;
      if (process.argv[3] !== 'origin' || process.argv[4] !== git('remote', 'get-url', '--push', 'origin')) fail('Публикуйте main только через настроенный origin.');
      if (branch() !== 'main' || localRef !== 'refs/heads/main' || localSha !== git('rev-parse', 'HEAD')) {
        fail('Публикация main разрешена только из локального main. Сначала перенесите и проверьте изменения в нём.');
      }
      if (dirty()) fail('В папке есть незакоммиченные или новые файлы. Проверьте их перед публикацией.');
      if (/^0+$/.test(remoteSha)) fail('Удалённый main отсутствует. Требуется отдельная проверка восстановления.');
      // Fetch the object for ancestry checks; the server still rejects a race
      // after this check because ordinary pushes never rewrite remote history.
      fetchMain();
      const currentRemote = git('rev-parse', 'origin/main');
      if (remoteSha !== currentRemote || !ancestor(currentRemote, localSha)) {
        fail('Удалённый main изменился или история разошлась. Публикация остановлена; сначала согласуйте изменения.');
      }
    }
  } else if (mode === 'check' || mode === 'sync') {
    fetchMain();
    if (branch() !== 'main') {
      if (mode === 'sync') fail('Синхронизация выполняется только в main. Рабочая ветка не изменена.');
      console.log(`Рабочая ветка: ${branch() || 'detached HEAD'}. Это отдельный локальный вариант сайта.`);
    } else {
      const [ahead, behind] = git('rev-list', '--left-right', '--count', 'HEAD...origin/main').split(/\s+/).map(Number);
      if (mode === 'sync') {
        if (dirty()) fail('Сначала сохраните локальные изменения. Автоматическое обновление грязной папки запрещено.');
        if (ahead) fail('Есть локальные коммиты. Автоматическая синхронизация остановлена для проверки.');
        git('merge', '--ff-only', 'origin/main');
        console.log(`main синхронизирован: ${git('rev-parse', '--short', 'HEAD')}.`);
      } else {
        if (behind) fail(`main отстаёт на ${behind} коммитов (локальных: ${ahead}). Сначала выполните pnpm sync:main; при расхождении нужна проверка.`);
        console.log(ahead || dirty()
          ? `ЛОКАЛЬНЫЙ ЧЕРНОВИК: неопубликованных коммитов ${ahead}; незакоммиченные файлы: ${dirty() ? 'есть' : 'нет'}.`
          : `main совпадает с origin/main (${git('rev-parse', '--short', 'HEAD')}). Статус публикации Pages проверяется отдельно.`);
      }
    }
  } else fail(`Неизвестный режим: ${mode}`);
} catch (error) {
  console.error(`Проверка синхронизации: ${error.message}`);
  process.exitCode = 1;
}
