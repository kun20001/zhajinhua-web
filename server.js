/* =========================================================
   炸金花 · 局域网联机服务端 v2.1（修复版）
   4 座固定房间 · 房主控制 · 手动开始
   启动：node server.js
   ========================================================= */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = 3000;
const MAX_SEATS = 4;

/* ================= WebSocket ================= */
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
function wsAccept(key) {
  return crypto.createHash('sha1').update(key + WS_MAGIC).digest('base64');
}
function encodeFrame(data, opcode = 0x01) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}
function parseFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (offset < buffer.length) {
    if (buffer.length - offset < 2) break;
    const opcode = buffer[offset] & 0x0f;
    const masked = (buffer[offset + 1] & 0x80) !== 0;
    let len = buffer[offset + 1] & 0x7f;
    let cursor = offset + 2;
    if (len === 126) {
      if (buffer.length - cursor < 2) break;
      len = buffer.readUInt16BE(cursor); cursor += 2;
    } else if (len === 127) {
      if (buffer.length - cursor < 8) break;
      len = Number(buffer.readBigUInt64BE(cursor)); cursor += 8;
    }
    let maskKey = null;
    if (masked) {
      if (buffer.length - cursor < 4) break;
      maskKey = buffer.slice(cursor, cursor + 4); cursor += 4;
    }
    if (buffer.length - cursor < len) break;
    const payload = Buffer.from(buffer.slice(cursor, cursor + len));
    if (maskKey) for (let i = 0; i < payload.length; i++) payload[i] ^= maskKey[i % 4];
    frames.push({ opcode, payload });
    offset = cursor + len;
  }
  return { frames, rest: buffer.slice(offset) };
}

/* ================= 牌型 ================= */
function makeDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
  return d;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function evaluate(cards) {
  if (!cards || cards.length < 3) return { type: 0, key: [0] };
  const ranks = cards.map(c => c.r).sort((a,b) => b-a);
  const suits = cards.map(c => c.s);
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const asc = [...ranks].sort((a,b) => a-b);
  let sh = 0;
  if (asc[0]+1 === asc[1] && asc[1]+1 === asc[2]) sh = asc[2];
  else if (asc[0] === 2 && asc[1] === 3 && asc[2] === 14) sh = 3;
  const isStraight = sh > 0;
  if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) return { type: 6, key: [ranks[0]] };
  if (isFlush && isStraight) return { type: 5, key: [sh] };
  if (isFlush) return { type: 4, key: ranks };
  if (isStraight) return { type: 3, key: [sh] };
  if (ranks[0] === ranks[1]) return { type: 2, key: [ranks[0], ranks[2]] };
  if (ranks[1] === ranks[2]) return { type: 2, key: [ranks[1], ranks[0]] };
  return { type: 1, key: ranks };
}
function compareHand(a, b) {
  if (a.type !== b.type) return a.type - b.type;
  const len = Math.max(a.key.length, b.key.length);
  for (let i = 0; i < len; i++) {
    const x = a.key[i] ?? 0, y = b.key[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}
function handScore(cards) {
  const h = evaluate(cards);
  switch (h.type) {
    case 6: return 0.95 + (h.key[0]-2)/12*0.05;
    case 5: return 0.85 + (h.key[0]-2)/12*0.08;
    case 4: return 0.66 + (h.key[0]-2)/12*0.13;
    case 3: return 0.52 + (h.key[0]-2)/12*0.10;
    case 2: return 0.28 + (h.key[0]-2)/12*0.22;
    default: return 0.02 + (h.key[0]-2)/12*0.26;
  }
}

/* ================= 牌场 ================= */
const ROOM_CONFIGS = {
  novice:   { name: '初级场', icon: '🌱', buyIn: 5000,   baseBet: 10,   maxBet: 300,    aiLevel: 1 },
  advanced: { name: '高级场', icon: '⚔️', buyIn: 10000,  baseBet: 30,   maxBet: 1000,   aiLevel: 2 },
  master:   { name: '大师场', icon: '🎯', buyIn: 30000,  baseBet: 100,  maxBet: 3000,   aiLevel: 3 },
  legend:   { name: '传奇场', icon: '🔥', buyIn: 80000,  baseBet: 300,  maxBet: 10000,  aiLevel: 4 },
  king:     { name: '王者场', icon: '👑', buyIn: 200000, baseBet: 1000, maxBet: 30000,  aiLevel: 5 },
  god:      { name: '神之场', icon: '⚡', buyIn: 500000, baseBet: 3000, maxBet: 100000, aiLevel: 6 }
};

const AI_NAMES = ['老王','阿珍','大熊','小明','阿呆','菜鸟','赌圣','千王','雀神'];

/* ================= 全局 ================= */
const rooms = new Map();
const clients = new Map();
let nextClientId = 1;

function genRoomId() {
  for (let i = 0; i < 100; i++) {
    const id = String(1000 + Math.floor(Math.random() * 9000));
    if (!rooms.has(id)) return id;
  }
  return null;
}

/* =========================================================
   Room
   ========================================================= */
class Room {
  constructor(id, hostPlayer) {
    this.id = id;
    this.config = { roomId: 'king' };
    this.seats = [hostPlayer, null, null, null];
    this.game = null;
    this.phase = 'lobby';
    this.logs = [];
    this.timer = null;
    this.createdAt = Date.now();
    this.dealerIdx = Math.floor(Math.random() * 4);   // 新增：庄家座位，持久化
  }

  getRoomCfg() {
    return ROOM_CONFIGS[this.config.roomId] || ROOM_CONFIGS.king;
  }

  getHost() {
    return this.seats.find(s => s && s.isHost);
  }

  addLog(msg) {
    this.logs.push({ t: Date.now(), msg });
    if (this.logs.length > 200) this.logs.shift();
  }

  /* ============ 广播 ============ */
  broadcast() {
    for (const s of this.seats) {
      if (!s || s.isAI || !s.socketId) continue;
      const client = clients.get(s.socketId);
      if (client && client.socket && !client.socket.destroyed) {
        try {
          const msg = {
            type: 'state',
            game: this.publicStateFor(s.id),
            logs: this.logs.slice(-60)
          };
          client.socket.write(encodeFrame(JSON.stringify(msg)));
        } catch (e) {}
      }
    }
  }

  publicStateFor(viewerId) {
    const base = {
      roomId: this.id,
      config: this.config,
      roomCfg: this.getRoomCfg(),
      phase: this.game ? this.game.phase : 'lobby',
      hostId: (this.getHost() || {}).id || null,
      seats: this.seats.map(s => {
        if (!s) return null;
        return {
          id: s.id,
          name: s.name,
          isAI: s.isAI,
          isHost: s.isHost,
          coins: s.coins,
          connected: s.connected
        };
      })
    };

    if (!this.game) return base;

    return Object.assign(base, {
      handNo: this.game.handNo,
      pot: this.game.pot,
      bet: this.game.bet,
      turn: this.game.turn,
      dealer: this.game.dealer,
      actionsThisHand: this.game.actionsThisHand,
      players: this.game.players.map(p => {
        if (!p) return null;
        const showCards = (p.id === viewerId && p.looked) || p.revealed;
        return {
          seatIdx: p.seatIdx,
          id: p.id,
          name: p.name,
          isAI: p.isAI,
          coins: p.coins,
          folded: p.folded,
          out: p.out,
          looked: p.looked,
          betInHand: p.betInHand,
          revealed: p.revealed,
          lastAction: p.lastAction,
          cards: showCards ? p.cards : null
        };
      })
    });
  }

  /* ============ 玩家加入 ============ */
  addPlayer(client, name, token) {
    /* 断线重连（token 必须有效，避免 null===null 误判） */
    const existing = token
      ? this.seats.find(s => s && !s.isAI && s.token === token)
      : null;

    if (existing) {
      existing.connected = true;
      existing.socketId = client.id;
      existing.disconnectAt = null;
      client.roomId = this.id;
      client.playerId = existing.id;
      this.addLog(`🔄 ${name} 重连成功`);
      try {
        client.socket.write(encodeFrame(JSON.stringify({
          type: 'joined',
          roomId: this.id,
          playerId: existing.id
        })));
      } catch(e){}
      this.broadcast();
      return existing;
    }

    const emptyIdx = this.seats.findIndex(s => s === null);
    if (emptyIdx === -1) throw new Error('房间已满');

    const cfg = this.getRoomCfg();
    const player = {
      id: 'p_' + crypto.randomBytes(4).toString('hex'),
      name,
      isAI: false,
      isHost: false,
      coins: cfg.buyIn,
      connected: true,
      token,
      socketId: client.id,
      disconnectAt: null
    };
    this.seats[emptyIdx] = player;
    client.roomId = this.id;
    client.playerId = player.id;
    this.addLog(`👤 ${name} 加入了房间（位置 ${emptyIdx + 1}）`);

    try {
      client.socket.write(encodeFrame(JSON.stringify({
        type: 'joined',
        roomId: this.id,
        playerId: player.id
      })));
    } catch(e){}

    this.broadcast();
    return player;
  }

  removePlayer(playerId) {
    const idx = this.seats.findIndex(s => s && s.id === playerId);
    if (idx === -1) return;
    const p = this.seats[idx];
    if (p.isAI) return;

    if (this.game && this.game.phase === 'betting') {
      p.connected = false;
      p.disconnectAt = Date.now();
      this.addLog(`⚠️ ${p.name} 断线，30 秒内可重连`);
      const cur = this.game.players[this.game.turn];
      if (cur && cur.id === playerId && !cur.folded && !cur.out) {
        this.doAction(cur.seatIdx, { action: 'fold' });
      }
      setTimeout(() => {
        if (p.connected) return;
        if (Date.now() - (p.disconnectAt || 0) < 29000) return;
        p.leave = true;
        this.addLog(`💀 ${p.name} 断线超时，离场`);
        this.seats[idx] = null;
        this.broadcast();
        this.checkAfterLeave();
      }, 30500);
      this.broadcast();
    } else {
      this.addLog(`🚪 ${p.name} 离开了房间`);
      this.seats[idx] = null;
      this.broadcast();
      this.checkAfterLeave();
    }
  }

  checkAfterLeave() {
    const humans = this.seats.filter(s => s && !s.isAI && s.connected);
    if (humans.length === 0) {
      setTimeout(() => this.destroy(), 1000);
      return;
    }
    const host = this.getHost();
    if (!host || !host.connected) {
      const newHost = this.seats.find(s => s && !s.isAI && s.connected);
      if (newHost) {
        this.seats.forEach(s => { if (s) s.isHost = false; });
        newHost.isHost = true;
        this.addLog(`👑 ${newHost.name} 成为新房主`);
        this.broadcast();
      }
    }
  }

  destroy() {
    if (this.timer) clearTimeout(this.timer);
    for (const s of this.seats) {
      if (!s || s.isAI || !s.socketId) continue;
      const c = clients.get(s.socketId);
      if (c && c.socket && !c.socket.destroyed) {
        try {
          c.socket.write(encodeFrame(JSON.stringify({ type: 'room_destroyed' })));
        } catch(e){}
      }
    }
    rooms.delete(this.id);
    console.log(`[房间 ${this.id}] 已销毁`);
  }

  /* ============ 房主操作 ============ */
  addAI(byPlayerId) {
    const host = this.getHost();
    if (!host || host.id !== byPlayerId) throw new Error('只有房主可以添加人机');
    if (this.game && this.game.phase === 'betting') throw new Error('游戏进行中');
    const emptyIdx = this.seats.findIndex(s => s === null);
    if (emptyIdx === -1) throw new Error('房间已满');
    const cfg = this.getRoomCfg();
    const usedNames = this.seats.filter(s => s).map(s => s.name);
    const available = AI_NAMES.filter(n => !usedNames.includes(n + '_AI'));
    const name = (available[0] || ('人机' + (emptyIdx + 1))) + '_AI';
    this.seats[emptyIdx] = {
      id: 'ai_' + crypto.randomBytes(3).toString('hex'),
      name,
      isAI: true,
      isHost: false,
      coins: cfg.buyIn,
      connected: true,
      token: null,
      socketId: null,
      disconnectAt: null
    };
    this.addLog(`🤖 房主添加了人机 ${name}`);
    this.broadcast();
  }

  removeAI(byPlayerId) {
    const host = this.getHost();
    if (!host || host.id !== byPlayerId) throw new Error('只有房主可以移除人机');
    if (this.game && this.game.phase === 'betting') throw new Error('游戏进行中');
    for (let i = this.seats.length - 1; i >= 0; i--) {
      if (this.seats[i] && this.seats[i].isAI) {
        const n = this.seats[i].name;
        this.seats[i] = null;
        this.addLog(`🚫 房主移除了人机 ${n}`);
        this.broadcast();
        return;
      }
    }
    throw new Error('没有人机可移除');
  }

  changeConfig(byPlayerId, roomKey) {
    const host = this.getHost();
    if (!host || host.id !== byPlayerId) throw new Error('只有房主可以修改牌场');
    if (this.game && this.game.phase === 'betting') throw new Error('游戏进行中');
    if (!ROOM_CONFIGS[roomKey]) throw new Error('无效牌场');
    this.config.roomId = roomKey;
    const cfg = this.getRoomCfg();
    for (const s of this.seats) {
      if (s) s.coins = cfg.buyIn;
    }
    this.addLog(`🎴 房主切换牌场为：${cfg.name}`);
    this.broadcast();
  }

  startGame(byPlayerId) {
    const host = this.getHost();
    if (!host || host.id !== byPlayerId) throw new Error('只有房主可以开始游戏');
    if (this.game && this.game.phase === 'betting') throw new Error('游戏进行中');
    const occupied = this.seats.filter(s => s);
    if (occupied.length < 2) throw new Error('至少需要 2 名玩家（真人或人机）');
    this.addLog('🎮 房主开始游戏！');
    this.startHand();
  }

  /* ============ 开局 ============ */
  startHand() {
    const cfg = this.getRoomCfg();

    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      if (s && s.coins < cfg.baseBet) {
        if (!s.isAI) this.addLog(`💀 ${s.name} 金币不足，离场`);
        this.seats[i] = null;
      }
    }

    const occupied = this.seats.filter(s => s);
    if (occupied.length < 2) {
      this.phase = 'lobby';
      this.game = null;
      this.addLog('⏹ 人数不足，返回等待室');
      this.broadcast();
      return;
    }

    if (!this.game) this.game = { handNo: 0 };
    this.game.handNo++;
    this.game.pot = 0;
    this.game.bet = cfg.baseBet;
    this.game.phase = 'betting';
    this.game.actionsThisHand = 0;

    this.game.players = this.seats.map((s, idx) => {
      if (!s) return null;
      return {
        seatIdx: idx,
        id: s.id,
        name: s.name,
        isAI: s.isAI,
        coins: s.coins,
        folded: false,
        out: false,
        looked: false,
        betInHand: 0,
        lastAction: '',
        revealed: false,
        cards: []
      };
    });

    for (const p of this.game.players) {
      if (!p) continue;
      p.coins -= cfg.baseBet;
      p.betInHand += cfg.baseBet;
      this.game.pot += cfg.baseBet;
    }

    // 轮庄（dealerIdx 存在 Room 上，跨局保持）
let guard = 0;
do {
  this.dealerIdx = (this.dealerIdx + 1) % this.game.players.length;
  guard++;
} while ((!this.game.players[this.dealerIdx]) && guard < 20);
this.game.dealer = this.dealerIdx;

    const deck = shuffle(makeDeck());
    for (let r = 0; r < 3; r++) {
      for (let k = 1; k <= this.game.players.length; k++) {
        const i = (this.game.dealer + k) % this.game.players.length;
        if (this.game.players[i]) {
          this.game.players[i].cards.push(deck.pop());
        }
      }
    }

    this.addLog(`—— 第 ${this.game.handNo} 局开始（庄家：${this.game.players[this.game.dealer].name}）——`);

    this.syncCoins();
    this.game.turn = this.nextActiveSeat(this.game.dealer);
    this.broadcast();
    this.scheduleNext();
  }

  nextActiveSeat(from) {
    const n = this.game.players.length;
    let x = from;
    for (let k = 0; k < n; k++) {
      x = (x + 1) % n;
      if (this.game.players[x] && !this.game.players[x].folded && !this.game.players[x].out) return x;
    }
    return from;
  }

  syncCoins() {
    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      const p = this.game.players[i];
      if (s && p) s.coins = p.coins;
    }
  }

  /* ============ 调度 ============ */
  scheduleNext() {
    if (this.timer) clearTimeout(this.timer);
    if (!this.game || this.game.phase !== 'betting') return;

    const alive = this.game.players.filter(p => p && !p.folded && !p.out);
    if (alive.length <= 1) {
      this.timer = setTimeout(() => this.showdown(), 800);
      return;
    }
    if (this.game.actionsThisHand >= 80) {
      this.addLog('⏰ 达到上限，强制摊牌');
      this.timer = setTimeout(() => this.showdown(), 600);
      return;
    }

    const cur = this.game.players[this.game.turn];
    if (!cur || cur.folded || cur.out) {
      this.game.turn = this.nextActiveSeat(this.game.turn);
      this.broadcast();
      this.scheduleNext();
      return;
    }

    if (cur.isAI) {
      this.timer = setTimeout(() => this.aiTurn(cur), 800 + Math.random() * 800);
    } else {
      const seat = this.seats[cur.seatIdx];
      if (seat && !seat.connected && seat.disconnectAt && Date.now() - seat.disconnectAt > 30000) {
        this.doAction(cur.seatIdx, { action: 'fold' });
      }
    }
  }

  /* ============ 玩家操作 ============ */
  doAction(seatIdx, action) {
    if (!this.game || this.game.phase !== 'betting') return;
    const cur = this.game.players[this.game.turn];
    if (!cur || cur.seatIdx !== seatIdx) return;
    if (cur.folded || cur.out) return;

    const cfg = this.getRoomCfg();
    const p = cur;
    const toCall = p.looked ? this.game.bet * 2 : this.game.bet;

    if (action.action === 'look') {
      if (p.looked) return;
      p.looked = true;
      p.lastAction = '看牌';
      this.addLog(`👁 ${p.name} 看牌`);
      this.broadcast();
      return;
    }

    this.game.actionsThisHand++;

    if (action.action === 'fold') {
      p.folded = true;
      p.lastAction = '弃牌';
      this.addLog(`🚪 ${p.name} 弃牌`);
    } else if (action.action === 'call') {
      if (p.coins < toCall) {
        p.folded = true;
        p.lastAction = '弃牌';
        this.addLog(`🚪 ${p.name} 金币不足，弃牌`);
      } else {
        p.coins -= toCall;
        p.betInHand += toCall;
        this.game.pot += toCall;
        p.lastAction = `跟注 ${toCall}`;
        this.addLog(`💰 ${p.name} 跟注 ${toCall}`);
      }
    } else if (action.action === 'raise') {
      let newBet = Math.max(this.game.bet + 1, action.to | 0);
      if (cfg.maxBet !== Infinity) newBet = Math.min(newBet, cfg.maxBet);
      if (newBet <= this.game.bet) {
        if (p.coins >= toCall) {
          p.coins -= toCall;
          p.betInHand += toCall;
          this.game.pot += toCall;
          p.lastAction = `跟注 ${toCall}`;
          this.addLog(`💰 ${p.name} 跟注 ${toCall}`);
        } else {
          p.folded = true;
          this.addLog(`🚪 ${p.name} 金币不足，弃牌`);
        }
      } else {
        this.game.bet = newBet;
        const amt = p.looked ? newBet * 2 : newBet;
        if (p.coins < amt) {
          p.folded = true;
          p.lastAction = '弃牌';
          this.addLog(`🚪 ${p.name} 加注失败，弃牌`);
        } else {
          p.coins -= amt;
          p.betInHand += amt;
          this.game.pot += amt;
          p.lastAction = `加注到 ${newBet}`;
          this.addLog(`🔥 ${p.name} 加注到 ${newBet}`);
        }
      }
    } else if (action.action === 'compare') {
      const target = this.game.players.find(x => x && x.id === action.targetId && !x.folded && !x.out);
      if (!target || target.id === p.id) {
        if (p.coins >= toCall) {
          p.coins -= toCall;
          p.betInHand += toCall;
          this.game.pot += toCall;
          p.lastAction = `跟注 ${toCall}`;
          this.addLog(`💰 ${p.name} 跟注 ${toCall}`);
        } else {
          p.folded = true;
          this.addLog(`🚪 ${p.name} 金币不足，弃牌`);
        }
      } else if (p.coins < toCall) {
        p.folded = true;
        this.addLog(`🚪 ${p.name} 金币不足，弃牌`);
      } else {
        p.coins -= toCall;
        p.betInHand += toCall;
        this.game.pot += toCall;
        p.lastAction = '比牌';
        this.addLog(`⚔️ ${p.name} 花 ${toCall} 与 ${target.name} 比牌`);
        const c = compareHand(evaluate(p.cards), evaluate(target.cards));
        const loser = c > 0 ? target : p;
        loser.folded = true;
        loser.lastAction = '比牌失败';
        const names = ['','单张','对子','顺子','金花','顺金','豹子'];
        this.addLog(`   → ${p.name}【${names[evaluate(p.cards).type]}】 vs ${target.name}【${names[evaluate(target.cards).type]}】`);
        this.addLog(`   → ${loser.name} 出局`);
      }
    }

    this.syncCoins();
    this.broadcast();

    const alive = this.game.players.filter(x => x && !x.folded && !x.out);
    if (alive.length <= 1) {
      this.timer = setTimeout(() => this.showdown(), 800);
      return;
    }

    this.game.turn = this.nextActiveSeat(this.game.turn);
    this.broadcast();
    this.scheduleNext();
  }

  /* ============ AI ============ */
  aiTurn(ai) {
    if (!this.game || ai.folded || ai.out) return;
    if (this.game.turn !== ai.seatIdx) return;
    const toCall = ai.looked ? this.game.bet * 2 : this.game.bet;

    if (!ai.looked) {
      const pressure = this.game.bet / Math.max(ai.coins, 1);
      const lookProb = Math.min(0.9, 0.25 + pressure * 1.5 + (ai.coins < toCall * 3 ? 0.3 : 0));
      if (Math.random() < lookProb) {
        this.doAction(ai.seatIdx, { action: 'look' });
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.aiTurn(ai), 500 + Math.random() * 500);
        return;
      }
      if (ai.coins < toCall) { this.doAction(ai.seatIdx, { action: 'fold' }); return; }
      this.doAction(ai.seatIdx, { action: 'call' });
      return;
    }

    const score = handScore(ai.cards);
    const alive = this.game.players.filter(x => x && !x.folded && !x.out).length;
    const costRatio = toCall / Math.max(ai.coins, 1);

    let foldAt = 0.20 + (alive - 2) * 0.05 + costRatio * 0.8;
    foldAt = Math.max(0.06, Math.min(0.75, foldAt));

    if (score < foldAt && Math.random() > 0.15) {
      this.doAction(ai.seatIdx, { action: 'fold' });
      return;
    }

    if (this.game.actionsThisHand > 4 && ai.coins >= toCall && score > 0.7) {
      const others = this.game.players.filter(x => x && !x.folded && !x.out && x.id !== ai.id);
      if (others.length === 1 && Math.random() < 0.4) {
        this.doAction(ai.seatIdx, { action: 'compare', targetId: others[0].id });
        return;
      }
      if (score > 0.85 && Math.random() < 0.3 && others.length > 0) {
        const t = others[Math.floor(Math.random() * others.length)];
        this.doAction(ai.seatIdx, { action: 'compare', targetId: t.id });
        return;
      }
    }

    const cfg = this.getRoomCfg();
    if (score > 0.65 && Math.random() < 0.5 && ai.coins > toCall * 3) {
      const maxBet = cfg.maxBet === Infinity ? 1e12 : cfg.maxBet;
      const target = Math.min(this.game.bet * 2, maxBet);
      if (target > this.game.bet) {
        this.doAction(ai.seatIdx, { action: 'raise', to: target });
        return;
      }
    }

    if (ai.coins < toCall) { this.doAction(ai.seatIdx, { action: 'fold' }); return; }
    this.doAction(ai.seatIdx, { action: 'call' });
  }

  /* ============ 摊牌 ============ */
  showdown() {
    if (!this.game) return;
    this.game.phase = 'showdown';
    for (const p of this.game.players) {
      if (p && !p.out && !p.folded) p.revealed = true;
    }
    this.phase = 'showdown';
    this.broadcast();

    setTimeout(() => {
      if (!this.game) return;
      const alive = this.game.players.filter(p => p && !p.folded && !p.out);
      if (alive.length === 0) {
        this.game.pot = 0;
      } else if (alive.length === 1) {
        const w = alive[0];
        w.coins += this.game.pot;
        this.addLog(`🏆 ${w.name} 赢得底池 ${this.game.pot}`);
        this.game.pot = 0;
      } else {
        const scored = alive.map(p => ({ p, h: evaluate(p.cards) }));
        let best = scored[0];
        let winners = [scored[0]];
        for (let i = 1; i < scored.length; i++) {
          const c = compareHand(scored[i].h, best.h);
          if (c > 0) { best = scored[i]; winners = [scored[i]]; }
          else if (c === 0) winners.push(scored[i]);
        }
        const total = this.game.pot;
        const share = Math.floor(total / winners.length);
        for (const w of winners) w.p.coins += share;
        this.addLog(`🏆 ${winners.map(w => w.p.name).join('、')} 赢得底池 ${total}`);
        this.game.pot = 0;
      }

      const names = ['','单张','对子','顺子','金花','顺金','豹子'];
      for (const p of alive) {
        this.addLog(`   ${p.name}：${names[evaluate(p.cards).type]}`);
      }

      this.syncCoins();
      this.broadcast();

      setTimeout(() => this.endHand(), 2500);
    }, 1000);
  }

  endHand() {
    if (!this.game) return;
    this.game.phase = 'idle';
    this.phase = 'idle';

    const cfg = this.getRoomCfg();
    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      if (s && s.coins < cfg.baseBet) {
        if (!s.isAI) this.addLog(`💀 ${s.name} 金币耗尽，离场`);
        this.seats[i] = null;
      }
    }

    const occupied = this.seats.filter(s => s);
    this.broadcast();

    if (occupied.filter(s => !s.isAI).length === 0) {
      setTimeout(() => this.destroy(), 2000);
      return;
    }

    this.game = null;
    this.phase = 'lobby';
    this.addLog('⏹ 本局结束，返回等待室');
    this.broadcast();
  }
}

/* ================= 消息处理 ================= */
function handleClientMessage(client, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch (e) { return; }

  const reply = (obj) => {
    try { client.socket.write(encodeFrame(JSON.stringify(obj))); } catch(e){}
  };

  if (msg.type === 'ping') { reply({ type: 'pong' }); return; }

  if (msg.type === 'set_name') {
    const name = String(msg.name || '').trim();
    if (!/^[\u4e00-\u9fa5]{2,6}$/.test(name)) {
      reply({ type: 'error', message: '名字必须是 2-6 个汉字' });
      return;
    }
    client.name = name;
    reply({ type: 'name_ok', name });
    return;
  }

  if (msg.type === 'list_rooms') {
    const list = [...rooms.values()].map(r => ({
      id: r.id,
      config: r.config,
      humans: r.seats.filter(s => s && !s.isAI).length,
      total: r.seats.filter(s => s).length,
      phase: r.phase
    }));
    reply({ type: 'rooms', rooms: list });
    return;
  }

  if (msg.type === 'create_room') {
    if (!client.name) { reply({type:'error', message:'请先设置名字'}); return; }
    if (client.roomId) { reply({type:'error', message:'你已在房间中'}); return; }
    const token = String(msg.token || '').trim();
    if (!token) { reply({type:'error', message:'身份令牌缺失，请刷新页面'}); return; }
    const roomId = genRoomId();
    if (!roomId) { reply({ type: 'error', message: '房间已满' }); return; }

    const cfg = ROOM_CONFIGS[msg.roomKey] || ROOM_CONFIGS.king;
    const hostPlayer = {
      id: 'p_' + crypto.randomBytes(4).toString('hex'),
      name: client.name,
      isAI: false,
      isHost: true,
      coins: cfg.buyIn,
      connected: true,
      token: token,
      socketId: client.id,
      disconnectAt: null
    };

    const room = new Room(roomId, hostPlayer);
    room.config.roomId = msg.roomKey && ROOM_CONFIGS[msg.roomKey] ? msg.roomKey : 'king';
    rooms.set(roomId, room);

    client.roomId = roomId;
    client.playerId = hostPlayer.id;
    room.addLog(`🏠 ${client.name} 创建了房间`);

    reply({ type: 'room_created', roomId, playerId: hostPlayer.id });
    room.broadcast();
    console.log(`[房间 ${roomId}] 由 ${client.name} 创建`);
    return;
  }

  if (msg.type === 'join_room') {
    if (!client.name) { reply({type:'error', message:'请先设置名字'}); return; }
    const token = String(msg.token || '').trim();
    if (!token) { reply({type:'error', message:'身份令牌缺失，请刷新页面'}); return; }
    const roomId = String(msg.roomId || '').trim();
    if (!/^\d{4}$/.test(roomId)) { reply({type:'error', message:'房间号必须是 4 位数字'}); return; }
    const room = rooms.get(roomId);
    if (!room) { reply({ type: 'error', message: '房间不存在' }); return; }
    if (client.roomId && client.roomId !== roomId) {
      reply({ type: 'error', message: '你已在其他房间' });
      return;
    }
    try {
      room.addPlayer(client, client.name, token);
      console.log(`[房间 ${roomId}] ${client.name} 加入`);
    } catch (e) {
      reply({ type: 'error', message: e.message });
    }
    return;
  }

  if (msg.type === 'leave_room') {
    if (client.roomId) {
      const room = rooms.get(client.roomId);
      if (room) room.removePlayer(client.playerId);
      client.roomId = null;
      client.playerId = null;
    }
    reply({ type: 'left' });
    return;
  }

  if (msg.type === 'add_ai' || msg.type === 'remove_ai' || msg.type === 'start_game' || msg.type === 'change_config') {
    if (!client.roomId) return;
    const room = rooms.get(client.roomId);
    if (!room) return;
    try {
      if (msg.type === 'add_ai') room.addAI(client.playerId);
      else if (msg.type === 'remove_ai') room.removeAI(client.playerId);
      else if (msg.type === 'start_game') room.startGame(client.playerId);
      else if (msg.type === 'change_config') room.changeConfig(client.playerId, msg.roomKey);
    } catch (e) {
      reply({ type: 'error', message: e.message });
    }
    return;
  }

  if (msg.type === 'action') {
    console.log('[ACTION] 收到来自', client.name, '的操作:', JSON.stringify(msg.action));
    if (!client.roomId || !client.playerId) return;
    const room = rooms.get(client.roomId);
    if (!room) return;
    const seat = room.seats.find(s => s && s.id === client.playerId);
    if (!seat) return;
    const seatIdx = room.seats.indexOf(seat);
    room.doAction(seatIdx, msg.action || {});
    return;
  }
}

/* ================= HTTP + WS ================= */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jjh': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  if (url === '/favicon.ico') { res.writeHead(204); res.end(); return; }

  if (url === '/index.html') {
    try {
      let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      const inject = `
<script>
/* ===== WebSocket 端口修复（必须在联机插件之前执行） ===== */
(function(){
  var OriginalWS = window.WebSocket;

  function rewrite(url){
    try{
      if (typeof url !== 'string') return url;
      if (url.indexOf('ws://') !== 0 && url.indexOf('wss://') !== 0) return url;

      // 1. 用户手动覆盖优先
      var custom = localStorage.getItem('ws_override');
      if (custom && custom.trim()) return custom.trim();

      // 2. https 页面 + wss + :3000 → 去掉端口（走 443）
      var u = new URL(url);
      if (location.protocol === 'https:' && u.protocol === 'wss:' && u.port === '3000'){
        u.port = '';
        return u.toString();
      }

      // 3. 其他情况原样返回（局域网 http://192.168.x.x:3000 不受影响）
      return url;
    }catch(e){ return url; }
  }

  function PatchedWS(url, protocols){
    var fixed = rewrite(url);
    if (fixed !== url) console.log('[WS修复]', url, '→', fixed);
    return protocols !== undefined ? new OriginalWS(fixed, protocols) : new OriginalWS(fixed);
  }
  PatchedWS.CONNECTING = OriginalWS.CONNECTING;
  PatchedWS.OPEN       = OriginalWS.OPEN;
  PatchedWS.CLOSING    = OriginalWS.CLOSING;
  PatchedWS.CLOSED     = OriginalWS.CLOSED;
  PatchedWS.prototype  = OriginalWS.prototype;
  window.WebSocket = PatchedWS;

  // 提供手动覆盖接口（在浏览器控制台调用）
  window.wsFix = {
    set: function(u){ u ? localStorage.setItem('ws_override', u) : localStorage.removeItem('ws_override'); console.log('已设置：', u || '默认'); },
    get: function(){ return localStorage.getItem('ws_override') || '(默认智能判断)'; },
    test: function(u){ return rewrite(u); }
  };

  console.log('[WS修复] 已加载。');
})();
</script>
<script>
/* ===== 联机插件（在修复之后加载） ===== */
(async function(){
  try {
    const r = await fetch('/lan_multiplayer.jjh');
    const code = await r.text();
    const fn = new Function('JJH', '"use strict";' + code);
    fn(window.JJH);
    setTimeout(() => {
      const btn = document.querySelector('.tab-btn[data-tab="lan"]');
      if (btn) btn.click();
    }, 300);
  } catch(e) { console.error('插件注入失败', e); }
})();
</script>`;
      html = html.replace('</body>', inject + '</body>');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    } catch (e) {
      res.writeHead(500); res.end('index.html 未找到'); return;
    }
  }

  const filePath = path.join(__dirname, decodeURIComponent(url));
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + wsAccept(key) + '\r\n\r\n'
  );

  const id = 'c_' + (nextClientId++);
  const client = {
    id, socket, name: null, token: null,
    roomId: null, playerId: null,
    buffer: Buffer.alloc(0)
  };
  clients.set(id, client);
  console.log(`[连接] ${id}`);

  socket.on('data', data => {
    client.buffer = Buffer.concat([client.buffer, data]);
    const { frames, rest } = parseFrames(client.buffer);
    client.buffer = rest;
    for (const f of frames) {
      if (f.opcode === 0x01) {
        handleClientMessage(client, f.payload.toString('utf8'));
      } else if (f.opcode === 0x08) {
        socket.end();
      } else if (f.opcode === 0x09) {
        try { socket.write(encodeFrame(f.payload, 0x0A)); } catch(e){}
      }
    }
  });

  socket.on('close', () => {
    console.log(`[断开] ${id} (${client.name || '未命名'})`);
    if (client.roomId) {
      const room = rooms.get(client.roomId);
      if (room) room.removePlayer(client.playerId);
    }
    clients.delete(id);
  });

  socket.on('error', () => {});
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('===========================================');
  console.log('  炸金花 · 局域网联机服务端 v2.1');
  console.log('  4 座固定房间 · 房主控制 · 手动开始');
  console.log('===========================================');
  console.log(`本机访问: http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`局域网访问: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log('===========================================');
});