import { chromium } from 'playwright';
import { LEVELS } from '../js/level.js';

const cases = [
  { name: 'desktop', viewport: { width: 1280, height: 900 }, hasTouch: false, deviceScaleFactor: 1 },
  { name: 'retina', viewport: { width: 1280, height: 900 }, hasTouch: false, deviceScaleFactor: 2 },
  { name: 'touch', viewport: { width: 390, height: 900 }, hasTouch: true },
  { name: 'no-audio', viewport: { width: 1280, height: 900 }, hasTouch: false, noAudio: true },
  { name: 'debug', viewport: { width: 1280, height: 900 }, hasTouch: false, debug: true },
  { name: 'asset-fallback', viewport: { width: 1280, height: 900 }, hasTouch: false, failAsset: true },
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const cfg of cases) {
    const page = await browser.newPage({ viewport: cfg.viewport, hasTouch: cfg.hasTouch, deviceScaleFactor: cfg.deviceScaleFactor || 1 });
    if (cfg.noAudio) {
      await page.addInitScript(() => {
        try { delete window.AudioContext; } catch {}
        try { delete window.webkitAudioContext; } catch {}
      });
    }
    if (cfg.failAsset) {
      await page.route('**/assets/img/player_0.webp', (route) => route.abort());
    }
    const errors = [];
    const badResponses = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`);
    });
    await page.goto(`http://127.0.0.1:8787/index.html${cfg.debug ? '?debug=1' : ''}`);
    await page.waitForTimeout(300);

    if (cfg.name === 'desktop') {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForTimeout(300);
    }

    const title = await page.evaluate(() => ({
      state: window.__game?.state,
      touch: document.body.classList.contains('touch'),
      buttons: document.querySelectorAll('.tbtn').length,
      canvas: [window.__game?.canvas.width, window.__game?.canvas.height],
      orientationHint: getComputedStyle(document.getElementById('orientationHint')).display !== 'none',
      debug: window.__game?.debug === true,
    }));
    let settingsCheck = null;
    let challengeCheck = null;
    let bossHintCheck = null;
    let challengeMatrix = null;
    let newGamePlusCheck = null;
    if (cfg.name === 'desktop') {
      challengeMatrix = await page.evaluate(() => {
        const g = window.__game;
        const rows = [];
        for (let i = 1; i <= 3; i++) {
          g.challengeIndex = i; g.start();
          rows.push({ index: i, name: g.challenge.name, seed: g.challenge.seed, lives: g.challenge.lives, weapon: g.challenge.weapon, bossRush: !!g.challenge.bossRush });
        }
        g.challengeIndex = 0; g.start(); g.state = 'title';
        return rows;
      });
      bossHintCheck = await page.evaluate(() => {
        const g = window.__game;
        g.start(); g.state = 'playing'; g.boss = null; g.player.x = 4700;
        const playerUpdate = g.player.update; g.player.update = () => {};
        g.update(1 / 60);
        g.player.update = playerUpdate;
        const hint = g.bossHint;
        g.state = 'title'; g.boss = null; g.player.x = 120;
        return { shown: typeof hint === 'string' && hint.length > 0, hint };
      });
      newGamePlusCheck = await page.evaluate((last) => {
        const g = window.__game;
        g.levelIdx = last; g.campaign.levels = Array.from({ length: last }, (_, level) => ({ level }));
        g.victory(); g.input.pressed.add('Enter'); g.input.pressed.add('KeyN'); g.update(1 / 60);
        const result = { levelIdx: g.levelIdx, newGamePlus: g.campaign.newGamePlus, difficulty: g.difficulty, state: g.state };
        g.challengeIndex = 0; g.levelIdx = 0; g.unlocked = 0; g.state = 'title';
        return result;
      }, LEVELS.length - 1);
      await page.keyboard.press('KeyC');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      challengeCheck = await page.evaluate(() => ({ mode: window.__game.challenge?.name, seed: window.__game.challenge?.seed, lives: window.__game.player.lives, weapon: window.__game.player.weapon }));
      await page.evaluate(() => { window.__game.state = 'title'; window.__game.challengeIndex = 0; window.__game.start(); });
      await page.waitForTimeout(80);
      await page.evaluate(() => { window.__game.state = 'title'; });
      await page.keyboard.press('KeyO');
      await page.waitForTimeout(100);
      for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100); }
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);
      await page.keyboard.press('KeyO');
      await page.waitForTimeout(100);
      settingsCheck = await page.evaluate(() => ({ state: window.__game.state, shake: JSON.parse(localStorage.getItem('steel_assault_save')).accessibility.shake }));
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const playing = await page.evaluate(() => window.__game?.state);
    await page.keyboard.down('KeyF');
    await page.waitForTimeout(250);
    await page.keyboard.up('KeyF');
    const shotCount = await page.evaluate(() => window.__game?.stats.shots || 0);
    const combat = await page.evaluate(() => {
      const g = window.__game;
      const enemy = (x, y, hp = 1) => ({ x, y, w: 30, h: 40, hp, maxHp: hp, type: 'runner', remove: false });
      g.enemies.list = [enemy(g.player.x, g.player.y, 1)];
      g.bullets = [{ x: g.player.x + 10, y: g.player.y + 10, vx: 0, vy: 0, r: 4, dmg: 1, type: 'R', life: 1, maxLife: 1, trailT: 1 }];
      g.updateBullets(0.001);
      const singleKill = g.enemies.list[0].remove === true;
      g.enemies.list = [enemy(250, 200, 1), enemy(280, 200, 1)];
      g.bullets = [{ x: 265, y: 220, vx: 0, vy: 0, r: 4, dmg: 1, aoe: 50, type: 'G', life: 1, maxLife: 1, trailT: 1 }];
      g.updateBullets(0.001);
      const aoeKills = g.enemies.list.filter((e) => e.remove).length;
      g.player.dead = false; g.player.inv = 1; g.player.lives = 2;
      g.enemies.bullets = [{ x: g.player.x + 8, y: g.player.y + 8, r: 8 }];
      g.checkCollisions();
      const invSafe = !g.player.dead;
      g.player.inv = 0; g.player.shieldT = 0; g.checkCollisions();
      const damageTaken = g.player.dead;
      return { singleKill, aoeKills, invSafe, damageTaken, hits: g.stats.hits, kills: g.stats.kills };
    });

    await page.evaluate(() => { window.__game.player.lives = 2; window.__game.killPlayer(); });
    await page.waitForTimeout(1600);
    const respawned = await page.evaluate(() => ({ state: window.__game.state, dead: window.__game.player.dead }));
    const backgroundPaused = await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      return window.__game.state;
    });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const resumed = await page.evaluate(() => window.__game?.state);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
    const paused = await page.evaluate(() => window.__game?.state);

    if (cfg.hasTouch) {
      const button = page.locator('.act-jump');
      await button.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' });
      title.pointerHeld = await page.evaluate(() => window.__game?.input.isDown('jump'));
      await button.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' });
      title.pointerReleased = !(await page.evaluate(() => window.__game?.input.isDown('jump')));
    }

    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
    await page.evaluate(() => {
      window.__game.player.lives = 1;
      window.__game.player.inv = 0;
      window.__game.player.shieldT = 0;
      window.__game.killPlayer();
    });
    await page.waitForTimeout(1600);
    const gameover = await page.evaluate(() => window.__game.state);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
    const returnedTitle = await page.evaluate(() => window.__game.state);

    let campaign = null;
    if (cfg.name === 'desktop') {
      await page.evaluate(() => {
        window.__game.levelIdx = 0;
        window.__game.unlocked = 0;
        window.__game.victory();
      });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      campaign = await page.evaluate(() => ({
        state: window.__game.state,
        levelIdx: window.__game.levelIdx,
        unlocked: window.__game.unlocked,
        saved: JSON.parse(localStorage.getItem('steel_assault_save')).unlocked,
      }));
    }

    const fallback = cfg.failAsset ? await page.evaluate(() => ({
      warning: document.getElementById('bootStatus')?.textContent || '',
      retryVisible: !document.getElementById('bootRetry')?.hidden,
    })) : null;
    results.push({ name: cfg.name, title, settingsCheck, challengeCheck, challengeMatrix, bossHintCheck, newGamePlusCheck, playing, shotCount, combat, respawned, backgroundPaused, resumed, paused, gameover, returnedTitle, campaign, fallback, errors, badResponses });
    await page.close();
  }
} finally {
  await browser.close();
}

for (const result of results) {
  if (result.errors.length || result.badResponses.length) {
    throw new Error(`${result.name} failed: ${JSON.stringify(result)}`);
  }
  if (result.title.state !== 'title' || result.playing !== 'playing' || result.shotCount < 1 || result.respawned.state !== 'playing' || result.respawned.dead || result.backgroundPaused !== 'paused' || result.resumed !== 'playing' || result.paused !== 'paused' || result.gameover !== 'gameover' || result.returnedTitle !== 'title') {
    throw new Error(`${result.name} state flow failed: ${JSON.stringify(result)}`);
  }
  if (result.name === 'desktop' && (!result.campaign || result.campaign.state !== 'playing' || result.campaign.levelIdx !== 1 || result.campaign.unlocked !== 1 || result.campaign.saved !== 1)) {
    throw new Error(`campaign progress failed: ${JSON.stringify(result)}`);
  }
  if (result.name === 'desktop' && (!result.combat || !result.combat.singleKill || result.combat.aoeKills !== 2 || !result.combat.invSafe || !result.combat.damageTaken)) {
    throw new Error(`combat collision failed: ${JSON.stringify(result)}`);
  }
  if (result.name === 'desktop' && (!result.settingsCheck || result.settingsCheck.state !== 'title' || result.settingsCheck.shake !== false)) {
    throw new Error(`accessibility settings failed: ${JSON.stringify(result)}`);
  }
  if (result.name === 'desktop' && (!result.challengeCheck || result.challengeCheck.mode !== '铁人挑战' || result.challengeCheck.seed !== 240810 || result.challengeCheck.lives !== 1 || result.challengeCheck.weapon !== 'R')) {
    throw new Error(`challenge mode failed: ${JSON.stringify(result)}`);
  }
  if (result.name === 'desktop' && !result.bossHintCheck?.shown) {
    throw new Error(`boss teaching failed: ${JSON.stringify(result)}`);
  }
  if (result.name === 'desktop' && (!result.challengeMatrix || result.challengeMatrix.length !== 3 || result.challengeMatrix[2].bossRush !== true || new Set(result.challengeMatrix.map((row) => row.seed)).size !== 3)) {
    throw new Error(`challenge matrix failed: ${JSON.stringify(result)}`);
  }
  if (result.name === 'desktop' && (!result.newGamePlusCheck?.newGamePlus || result.newGamePlusCheck.levelIdx !== 0 || result.newGamePlusCheck.state !== 'loading')) {
    throw new Error(`new game plus failed: ${JSON.stringify(result)}`);
  }
  if (result.name === 'retina' && (result.title.canvas[0] !== 1920 || result.title.canvas[1] !== 1080)) {
    throw new Error(`DPR resize failed: ${JSON.stringify(result)}`);
  }
  if (result.name === 'debug' && !result.title.debug) throw new Error(`debug HUD flag failed: ${JSON.stringify(result)}`);
  if (result.name === 'touch' && (!result.title.touch || result.title.buttons !== 8 || !result.title.orientationHint || !result.title.pointerHeld || !result.title.pointerReleased)) {
    throw new Error(`touch input failed: ${JSON.stringify(result)}`);
  }
  if (result.name === 'asset-fallback' && (!result.fallback.retryVisible || !result.fallback.warning.includes('手绘回退'))) {
    throw new Error(`asset fallback feedback failed: ${JSON.stringify(result)}`);
  }
}

console.log(JSON.stringify(results));
