const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

const NinjaGame = require('./game');

/**
 * @typedef {'START_ROUND_DRAFT' | 'NIGHT' | 'REVEAL' | 'SCORING' | 'GAME_OVER'} NextActionType
 * @description 对局推进动作类型联合。
 */

/**
 * @typedef {'spy' | 'hermit' | 'trickster' | 'blindAssassin' | 'jonin'} NightPhaseType
 * @description 夜晚子阶段联合类型。
 */

/**
 * @typedef {'lotus' | 'crane' | 'ronin'} FactionType
 * @description 阵营联合类型。
 */

/**
 * @interface IMatchMetadata
 * @description 对局元信息接口，用于保存阶段推进状态与日志。
 * @property {NextActionType} nextAction 下一步要执行的动作。
 * @property {boolean} gameOver 对局是否结束。
 * @property {FactionType | null} lastRoundWinner 上一轮胜方阵营。
 * @property {string[]} logs 日志数组，最多保留 24 条。
 */

/**
 * @typedef {Object} MatchMetadata
 * @description 对局元信息类型别名。
 * @property {NextActionType} nextAction 下一步动作。
 * @property {boolean} gameOver 是否终局。
 * @property {FactionType | null} lastRoundWinner 上一轮胜方。
 * @property {string[]} logs 对局日志。
 */

/**
 * @interface IPlayerUiState
 * @description 前端玩家展示结构接口。
 * @property {number} id 玩家 ID。
 * @property {string} name 玩家名称。
 * @property {boolean} isAlive 是否存活。
 * @property {FactionType} faction 当前流派。
 * @property {number | null} identity 当前身份号。
 * @property {FactionType | null} baseFaction 基础流派。
 * @property {number | null} baseIdentity 基础身份号。
 * @property {number} honorTokens 总荣誉值。
 * @property {number[]} honorMarkers 荣誉标记数组。
 * @property {Array<Record<string, any>>} handCards 手牌列表。
 * @property {Record<string, any> | null} passiveCard 被动牌。
 * @property {boolean} revealedFaction 是否揭示流派。
 * @property {number} honorTokensThisRound 本轮获得荣誉。
 */

/**
 * @typedef {Object} UiState
 * @description 前端可直接渲染的状态快照。
 * @property {IPlayerUiState[]} players 玩家状态数组。
 * @property {'draft' | 'night' | 'reveal' | 'scoring'} currentPhase 当前大阶段。
 * @property {'draft' | 'spy' | 'reveal' | 'scoring'} currentSubPhase 当前子阶段（夜晚默认指向 spy）。
 * @property {number} currentRound 当前轮次。
 * @property {number} roundNumber 当前轮次编号。
 * @property {number} discardCount 弃牌堆数量。
 * @property {number | null} currentPlayer 当前行动玩家 ID。
 * @property {NightPhaseType[]} phaseOrder 夜晚阶段顺序。
 */

/**
 * @typedef {Object} StageResult
 * @description 阶段推进接口返回对象。
 * @property {UiState} uiState UI 状态快照。
 * @property {string[]} logs 日志数组。
 * @property {string} summary 本次推进摘要。
 * @property {boolean} gameOver 是否终局。
 */

/**
 * @interface IStoredMatch
 * @description 数据库存储的对局记录接口。
 * @property {string} id 对局 ID。
 * @property {'active' | 'ended'} status 对局状态。
 * @property {any} game 反序列化后的游戏实例对象。
 * @property {MatchMetadata} metadata 对局元信息。
 */

const app = express();

app.use(cors());
app.use(express.json());

/**
 * @constant
 * @type {number}
 * @description HTTP 服务监听端口。
 * @default 3001
 */
const PORT = Number(process.env.PORT || 3001);

/**
 * @constant
 * @type {{host: string, port: number, user: string, password: string, database: string, waitForConnections: boolean, connectionLimit: number, queueLimit: number}}
 * @description MySQL 连接配置常量。
 */
const DB_CONFIG = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

/**
 * @enum {NextActionType}
 * @description 对局状态机下一动作枚举。
 */
const NEXT_ACTION = {
    /** 开始新一轮并执行轮抽 */
    START_ROUND_DRAFT: 'START_ROUND_DRAFT',
    /** 执行夜晚行动阶段 */
    NIGHT: 'NIGHT',
    /** 执行揭示阶段 */
    REVEAL: 'REVEAL',
    /** 执行计分阶段 */
    SCORING: 'SCORING',
    /** 对局结束 */
    GAME_OVER: 'GAME_OVER'
};

/**
 * @constant
 * @type {NightPhaseType[]}
 * @description 夜晚阶段执行顺序常量。
 */
const PHASE_ORDER = ['spy', 'hermit', 'trickster', 'blindAssassin', 'jonin'];

/**
 * @type {import('mysql2/promise').Pool | undefined}
 * @description MySQL 连接池实例，服务启动后初始化。
 */
let pool;

/**
 * @description 获取当前 ISO 时间字符串，用于日志打点。
 * @returns {string} ISO-8601 时间字符串。
 */
function nowIso() {
    return new Date().toISOString();
}

/**
 * @description 创建对局 ID，优先使用 UUID，退化为时间戳随机串。
 * @returns {string} 对局唯一 ID。
 * @example
 * const id = createMatchId();
 * console.log(id);
 */
function createMatchId() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `match_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @description 规范化玩家名数组，去除空白与空字符串。
 * @param {unknown} playerNames 请求体中的玩家名字段。
 * @returns {string[]} 清洗后的玩家名数组。
 */
function normalizePlayerNames(playerNames) {
    if (!Array.isArray(playerNames)) return [];
    return playerNames
        .map((name) => String(name || '').trim())
        .filter((name) => name.length > 0);
}

/**
 * @description 将游戏引擎状态与元数据转换为前端 UI 状态。
 * @param {any} game 游戏引擎实例。
 * @param {MatchMetadata} metadata 对局元信息。
 * @returns {UiState} 前端可渲染的状态结构。
 */
function buildUiState(game, metadata) {
    const permanentPlayers = Array.isArray(game.players) ? game.players : [];
    const roundPlayers = game.roundState?.players || [];

    const players = permanentPlayers.map((basePlayer) => {
        const roundPlayer = roundPlayers.find((p) => p.id === basePlayer.id);

        return {
            id: basePlayer.id,
            name: basePlayer.name,
            isAlive: roundPlayer ? Boolean(roundPlayer.isAlive) : true,
            faction: roundPlayer?.faction || basePlayer.baseFaction || 'lotus',
            identity: roundPlayer?.identity ?? basePlayer.baseIdentity ?? null,
            baseFaction: basePlayer.baseFaction ?? null,
            baseIdentity: basePlayer.baseIdentity ?? null,
            honorTokens: Number(basePlayer.honorTokens || 0),
            honorMarkers: Array.isArray(basePlayer.honorMarkers) ? basePlayer.honorMarkers : [],
            handCards: Array.isArray(roundPlayer?.handCards) ? roundPlayer.handCards : [],
            passiveCard: roundPlayer?.passiveCard || null,
            revealedFaction: roundPlayer ? Boolean(roundPlayer.revealedFaction) : false,
            honorTokensThisRound: Number(roundPlayer?.honorTokensThisRound || 0)
        };
    });

    let currentPhase = 'night';
    let currentSubPhase = 'spy';

    if (metadata.gameOver || metadata.nextAction === NEXT_ACTION.GAME_OVER) {
        currentPhase = 'scoring';
        currentSubPhase = 'scoring';
    } else if (metadata.nextAction === NEXT_ACTION.START_ROUND_DRAFT) {
        currentPhase = 'draft';
        currentSubPhase = 'draft';
    } else if (metadata.nextAction === NEXT_ACTION.NIGHT) {
        currentPhase = 'night';
        currentSubPhase = 'spy';
    } else if (metadata.nextAction === NEXT_ACTION.REVEAL) {
        currentPhase = 'reveal';
        currentSubPhase = 'reveal';
    } else if (metadata.nextAction === NEXT_ACTION.SCORING) {
        currentPhase = 'scoring';
        currentSubPhase = 'scoring';
    }

    return {
        players,
        currentPhase,
        currentSubPhase,
        currentRound: Number(game.roundNumber || 1),
        roundNumber: Number(game.roundNumber || 1),
        discardCount: Number(game.roundState?.discardPile?.length || 0),
        currentPlayer: players.length > 0 ? players[0].id : null,
        phaseOrder: PHASE_ORDER
    };
}

/**
 * @description 追加日志并裁剪到最多 24 条，避免日志无限增长。
 * @param {MatchMetadata} metadata 对局元信息。
 * @param {string[] | string} lines 待追加日志，可以是单条或数组。
 * @returns {void} 无返回值。
 */
function appendLogs(metadata, lines) {
    const logs = Array.isArray(metadata.logs) ? metadata.logs : [];
    const toAppend = Array.isArray(lines) ? lines : [String(lines)];
    metadata.logs = logs.concat(toAppend).slice(-24);
}

/**
 * @description 构建统一响应结果对象。
 * @param {any} game 游戏引擎实例。
 * @param {MatchMetadata} metadata 对局元信息。
 * @param {string} summary 本次操作摘要。
 * @returns {StageResult} 标准化阶段结果。
 */
function createResult(game, metadata, summary) {
    const uiState = buildUiState(game, metadata);
    return {
        uiState,
        logs: Array.isArray(metadata.logs) ? metadata.logs : [],
        summary,
        gameOver: Boolean(metadata.gameOver)
    };
}

/**
 * @description 校验玩家人数范围。
 * @param {string[]} playerNames 玩家名数组。
 * @returns {void} 无返回值。
 * @throws {Error} 当人数不在 4-11 时抛出。
 * @throws {Error} 规避方式：调用前确保 `playerNames.length` 在合法区间内。
 */
function validatePlayerCount(playerNames) {
    const count = playerNames.length;
    if (count < 4 || count > 11) {
        throw new Error('playerNames length must be between 4 and 11');
    }
}

/**
 * @description 将数据库中的 JSON 状态反序列化为可执行的游戏实例。
 * @param {string} stateJson 游戏状态 JSON 字符串。
 * @returns {any} 反序列化后的 NinjaGame 实例。
 * @throws {SyntaxError} 当 JSON 字符串格式不合法时抛出。
 */
function deserializeGame(stateJson) {
    const parsed = JSON.parse(stateJson);
    const game = new NinjaGame();
    Object.assign(game, parsed);
    return game;
}

/**
 * @async
 * @description 持久化对局状态与元信息到数据库。
 * @param {string} matchId 对局 ID。
 * @param {any} game 当前游戏实例。
 * @param {MatchMetadata} metadata 当前元信息。
 * @returns {Promise<void>} 持久化完成后结束。
 * @throws {Error} 当数据库更新失败时抛出。
 */
async function persistMatch(matchId, game, metadata) {
    const connection = await pool.getConnection();
    try {
        const stateJson = JSON.stringify(game);
        const metadataJson = JSON.stringify(metadata);

        await connection.execute(
            `
            UPDATE matches
            SET state_json = ?, metadata_json = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [stateJson, metadataJson, metadata.gameOver ? 'ended' : 'active', matchId]
        );
    } finally {
        connection.release();
    }
}

/**
 * @async
 * @description 根据对局 ID 读取数据库中的对局记录。
 * @param {string} matchId 对局 ID。
 * @returns {Promise<IStoredMatch | null>} 找到则返回记录，未找到返回 null。
 * @throws {Error} 当数据库读取或 JSON 解析失败时抛出。
 */
async function getStoredMatch(matchId) {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute(
            `SELECT id, status, state_json, metadata_json FROM matches WHERE id = ? LIMIT 1`,
            [matchId]
        );

        if (!rows || rows.length === 0) {
            return null;
        }

        const row = rows[0];
        const game = deserializeGame(row.state_json);
        const metadata = JSON.parse(row.metadata_json || '{}');

        return {
            id: row.id,
            status: row.status,
            game,
            metadata
        };
    } finally {
        connection.release();
    }
}

/**
 * @async
 * @description 按状态机推进一步（轮抽、夜晚、揭示、计分或结束）。
 * @param {any} game 游戏引擎实例。
 * @param {MatchMetadata} metadata 对局元信息。
 * @returns {Promise<StageResult>} 推进一步后的结果对象。
 * @throws {Error} 当 `nextAction` 非法或计分缺少胜方时抛出。
 * @example
 * const result = await advanceOneStep(stored.game, stored.metadata);
 */
async function advanceOneStep(game, metadata) {
    let summary = '';

    switch (metadata.nextAction) {
        case NEXT_ACTION.START_ROUND_DRAFT:
            game.startNewRound();
            await game.draftPhase();
            metadata.nextAction = NEXT_ACTION.NIGHT;
            summary = `Round ${game.roundNumber}: draft completed.`;
            appendLogs(metadata, [`[${nowIso()}] New round started`, `[${nowIso()}] Draft completed`]);
            break;

        case NEXT_ACTION.NIGHT:
            await game.executeNightPhase();
            metadata.nextAction = NEXT_ACTION.REVEAL;
            summary = `Round ${game.roundNumber}: night actions completed.`;
            appendLogs(metadata, [`[${nowIso()}] Night phase completed`]);
            break;

        case NEXT_ACTION.REVEAL: {
            const winnerFaction = game.executeRevealPhase();
            metadata.lastRoundWinner = winnerFaction;
            metadata.nextAction = NEXT_ACTION.SCORING;
            summary = `Round ${game.roundNumber}: reveal completed. Winner faction: ${winnerFaction}.`;
            appendLogs(metadata, [`[${nowIso()}] Reveal completed, winner faction: ${winnerFaction}`]);
            break;
        }

        case NEXT_ACTION.SCORING: {
            const winnerFaction = metadata.lastRoundWinner;
            if (!winnerFaction) {
                throw new Error('Missing lastRoundWinner before scoring phase');
            }

            const ended = game.scoringPhase(winnerFaction);
            if (ended) {
                metadata.gameOver = true;
                metadata.nextAction = NEXT_ACTION.GAME_OVER;
                summary = `Game over in round ${game.roundNumber}.`;
                appendLogs(metadata, [`[${nowIso()}] Scoring completed, game over`]);
            } else {
                game.cleanupRound();
                metadata.nextAction = NEXT_ACTION.START_ROUND_DRAFT;
                summary = `Round ${game.roundNumber - 1} scored, next round ready.`;
                appendLogs(metadata, [`[${nowIso()}] Scoring completed, next round ready`]);
            }
            break;
        }

        case NEXT_ACTION.GAME_OVER:
            summary = 'The match is already over.';
            appendLogs(metadata, [`[${nowIso()}] Advance ignored, match already over`]);
            break;

        default:
            throw new Error(`Unknown nextAction: ${metadata.nextAction}`);
    }

    return createResult(game, metadata, summary);
}

/**
 * @async
 * @description 健康检查接口，验证服务与数据库连通性。
 * @param {import('express').Request} req 请求对象。
 * @param {import('express').Response} res 响应对象。
 * @returns {Promise<void>} 响应发送后结束。
 */
app.get('/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS ok');
        res.json({ ok: true, db: rows?.[0]?.ok === 1 ? 'connected' : 'unknown' });
    } catch (error) {
        res.status(500).json({ ok: false, message: `Database error: ${error.message}` });
    }
});

/**
 * @async
 * @description 创建新对局并入库，返回首屏状态。
 * @param {import('express').Request} req 请求对象，`body.playerNames` 为玩家名数组。
 * @param {import('express').Response} res 响应对象。
 * @returns {Promise<void>} 响应发送后结束。
 * @throws {Error} 当玩家人数非法或写库失败时返回 400。
 */
app.post('/api/matches', async (req, res) => {
    try {
        const playerNames = normalizePlayerNames(req.body?.playerNames);
        validatePlayerCount(playerNames);

        const game = new NinjaGame();
        game.initGame(playerNames.length, playerNames);

        const metadata = {
            nextAction: NEXT_ACTION.START_ROUND_DRAFT,
            gameOver: false,
            lastRoundWinner: null,
            logs: [`[${nowIso()}] Match created with ${playerNames.length} players`]
        };

        const matchId = createMatchId();

        const connection = await pool.getConnection();
        try {
            await connection.execute(
                `
                INSERT INTO matches (id, status, state_json, metadata_json)
                VALUES (?, 'active', ?, ?)
                `,
                [matchId, JSON.stringify(game), JSON.stringify(metadata)]
            );
        } finally {
            connection.release();
        }

        const result = createResult(game, metadata, 'Match created. Click next stage to start round draft.');
        res.status(201).json({ matchId, result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @async
 * @description 推进指定对局一个阶段并持久化结果。
 * @param {import('express').Request} req 请求对象，包含 `params.matchId`。
 * @param {import('express').Response} res 响应对象。
 * @returns {Promise<import('express').Response | void>} 返回响应对象或结束。
 */
app.post('/api/matches/:matchId/advance', async (req, res) => {
    try {
        const { matchId } = req.params;
        const stored = await getStoredMatch(matchId);

        if (!stored) {
            return res.status(404).json({ message: 'Match not found' });
        }

        const result = await advanceOneStep(stored.game, stored.metadata);
        await persistMatch(matchId, stored.game, stored.metadata);

        return res.json({ result });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

/**
 * @async
 * @description 连续推进对局直到终局或达到安全步数上限。
 * @param {import('express').Request} req 请求对象，包含 `params.matchId`。
 * @param {import('express').Response} res 响应对象。
 * @returns {Promise<import('express').Response | void>} 返回响应对象或结束。
 * @default guard 500
 */
app.post('/api/matches/:matchId/run-to-end', async (req, res) => {
    try {
        const { matchId } = req.params;
        const stored = await getStoredMatch(matchId);

        if (!stored) {
            return res.status(404).json({ message: 'Match not found' });
        }

        let result = createResult(stored.game, stored.metadata, 'No operation executed.');
        let guard = 0;

        while (!stored.metadata.gameOver && guard < 500) {
            result = await advanceOneStep(stored.game, stored.metadata);
            guard += 1;
        }

        if (guard >= 500 && !stored.metadata.gameOver) {
            appendLogs(stored.metadata, [`[${nowIso()}] Guard stop reached in run-to-end`]);
            result = createResult(stored.game, stored.metadata, 'Stopped by safety guard before game over.');
        }

        await persistMatch(matchId, stored.game, stored.metadata);

        return res.json({ result });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

/**
 * @async
 * @description 确保数据库与 `matches` 表存在，并初始化主连接池。
 * @returns {Promise<void>} 初始化完成后结束。
 * @throws {Error} 当数据库不可达或建库建表失败时抛出。
 */
async function ensureDatabaseAndTable() {
    const setupPool = mysql.createPool({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        waitForConnections: true,
        connectionLimit: 2,
        queueLimit: 0
    });

    try {
        await setupPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await setupPool.end();
    } catch (error) {
        await setupPool.end();
        throw error;
    }

    pool = mysql.createPool(DB_CONFIG);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS matches (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            status ENUM('active', 'ended') NOT NULL DEFAULT 'active',
            state_json LONGTEXT NOT NULL,
            metadata_json LONGTEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

/**
 * @async
 * @description 启动 HTTP 服务，包含数据库初始化流程。
 * @returns {Promise<void>} 服务启动后结束。
 * @throws {Error} 当初始化失败时抛出，由调用方捕获后退出进程。
 * @example
 * startServer().catch(console.error);
 */
async function startServer() {
    await ensureDatabaseAndTable();

    app.listen(PORT, () => {
        console.log(`Ninja Night API server listening on port ${PORT}`);
        console.log(`MySQL target: ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
    });
}

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
