import { LEVELS } from '../js/level.js';

const BIN = 500;
for (const [index, level] of LEVELS.entries()) {
  const bins = Array.from({ length: Math.ceil(level.bossTriggerX / BIN) }, () => ({ enemies: 0, supplies: 0, hazards: 0, triggers: 0 }));
  const add = (x, key, amount = 1) => { bins[Math.min(bins.length - 1, Math.floor(x / BIN))][key] += amount; };
  for (const key of ['turrets', 'snipers', 'grenadiers', 'shielders', 'mortars', 'patrolbots', 'sandworms']) for (const entity of level[key] || []) add(entity.x, 'enemies');
  for (const trigger of level.triggers) { add(trigger.x, 'triggers'); if (trigger.type === 'drone') add(trigger.x, 'supplies'); else add(trigger.x, 'enemies', trigger.n || 1); }
  for (const [x0] of level.waters || []) add(x0, 'hazards');
  for (const laser of level.lasers || []) add(laser.x, 'hazards');
  for (const wind of level.winds || []) add(wind.x0, 'hazards');
  console.log(`L${index} ${level.name}: ${bins.map((bin, i) => `${i * BIN}-${Math.min((i + 1) * BIN, level.bossTriggerX)}:E${bin.enemies}/S${bin.supplies}/H${bin.hazards}/T${bin.triggers}`).join(' | ')}`);
}
