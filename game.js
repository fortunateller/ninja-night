// game.js
const { ninjaCards } = require('./cards');

/**
 * @constant
 * @type {{ninjaCards: Record<string, NinjaCard[]>}}
 * @description 游戏卡牌配置常量，提供所有类型忍者牌的基础数据。
 */

/**
 * @enum {string}
 * @description 玩家流派枚举，用于阵营判定与胜负计算。
 */
const FactionEnum = {
    /** 莲花派阵营 */
    LOTUS: 'lotus',
    /** 仙鹤派阵营 */
    CRANE: 'crane',
    /** 浪人阵营 */
    RONIN: 'ronin'
};

/**
 * @enum {string}
 * @description 夜晚阶段执行顺序枚举。
 */
const PhaseEnum = {
    /** 密探阶段 */
    SPY: 'spy',
    /** 隐士阶段 */
    HERMIT: 'hermit',
    /** 骗徒阶段 */
    TRICKSTER: 'trickster',
    /** 盲眼刺客阶段 */
    BLIND_ASSASSIN: 'blindAssassin',
    /** 上忍阶段 */
    JONIN: 'jonin',
    /** 被动阶段 */
    PASSIVE: 'passive'
};

/**
 * @typedef {'lotus' | 'crane' | 'ronin'} FactionType
 * @description 玩家流派联合类型。
 */

/**
 * @typedef {'spy' | 'hermit' | 'trickster' | 'blindAssassin' | 'jonin' | 'passive'} PhaseType
 * @description 忍者牌与阶段类型联合类型。
 */

/**
 * @interface INinjaCard
 * @description 忍者牌接口，描述牌库中的基础卡牌结构。
 * @property {number} id 卡牌唯一标识。
 * @property {PhaseType} type 卡牌所属类型。
 * @property {number} value 卡牌序号或强度值。
 * @property {string} name 卡牌名称。
 * @property {string} description 卡牌效果说明。
 * @property {boolean} [isPassive] 是否为被动技能牌。
 */

/**
 * @typedef {Object} NinjaCard
 * @description 忍者牌类型别名，对应 INinjaCard 的运行时对象。
 * @property {number} id 卡牌唯一标识。
 * @property {PhaseType} type 卡牌所属类型。
 * @property {number} value 卡牌序号或强度值。
 * @property {string} name 卡牌名称。
 * @property {string} description 卡牌效果说明。
 * @property {boolean} [isPassive] 是否为被动技能牌。
 */

/**
 * @interface IPlayerBase
 * @description 永久玩家数据接口，跨轮次保留。
 * @property {number} id 玩家唯一编号。
 * @property {string} name 玩家显示名称。
 * @property {number} honorTokens 玩家当前总荣誉分。
 * @property {number[]} honorMarkers 玩家荣誉标记数组。
 * @property {FactionType | null} baseFaction 本轮基础流派。
 * @property {number | null} baseIdentity 本轮基础身份号，浪人为 null。
 */

/**
 * @typedef {Object} PlayerBase
 * @description 永久玩家类型别名。
 * @property {number} id 玩家唯一编号。
 * @property {string} name 玩家显示名称。
 * @property {number} honorTokens 玩家当前总荣誉分。
 * @property {number[]} honorMarkers 玩家荣誉标记数组。
 * @property {FactionType | null} baseFaction 本轮基础流派。
 * @property {number | null} baseIdentity 本轮基础身份号，浪人为 null。
 */

/**
 * @interface IRoundPlayer
 * @extends IPlayerBase
 * @description 单轮中的玩家快照接口，记录轮内状态与临时字段。
 * @property {FactionType} faction 本轮流派。
 * @property {number | null} identity 本轮身份号。
 * @property {boolean} isAlive 是否存活。
 * @property {NinjaCard[]} handCards 当前手牌。
 * @property {boolean} revealedFaction 流派是否已揭示。
 * @property {number} honorTokensThisRound 本轮获得的荣誉。
 * @property {NinjaCard[] | null} [draftCards] 轮抽临时牌组。
 * @property {NinjaCard | null} [selectedCard] 轮抽选中的牌。
 * @property {NinjaCard[] | null} [passCards] 轮抽待传递的牌。
 * @property {NinjaCard | null} passiveCard 被动技能牌。
 */

/**
 * @typedef {Object} RoundPlayer
 * @description 轮次玩家类型别名。
 * @property {number} id 玩家唯一编号。
 * @property {string} name 玩家显示名称。
 * @property {FactionType} faction 本轮流派。
 * @property {number | null} identity 本轮身份号。
 * @property {boolean} isAlive 是否存活。
 * @property {NinjaCard[]} handCards 当前手牌。
 * @property {boolean} revealedFaction 流派是否已揭示。
 * @property {number} honorTokensThisRound 本轮获得的荣誉。
 * @property {NinjaCard[] | null} [draftCards] 轮抽临时牌组。
 * @property {NinjaCard | null} [selectedCard] 轮抽选中的牌。
 * @property {NinjaCard[] | null} [passCards] 轮抽待传递的牌。
 * @property {NinjaCard | null} passiveCard 被动技能牌。
 */

/**
 * @typedef {Object} RoundState
 * @description 单轮游戏状态类型，包含牌堆、弃牌与获胜阵营。
 * @property {RoundPlayer[]} players 本轮玩家状态数组。
 * @property {NinjaCard[]} deck 本轮可抽牌堆。
 * @property {NinjaCard[]} discardPile 本轮弃牌堆。
 * @property {number} phaseIndex 当前阶段索引。
 * @property {FactionType | null} roundWinner 本轮胜方。
 */

/**
 * @typedef {Object} EarlyRoundEndResult
 * @description 提前结束判定结果。
 * @property {boolean} shouldEnd 是否需要提前结束夜晚阶段。
 * @property {string} reason 提前结束原因。
 */

/**
 * @typedef {Object} GameStateSnapshot
 * @description 对外返回的游戏状态快照结构。
 * @property {Array<{id: number, name: string, honorTokens: number, honorMarkers: number[], baseFaction: FactionType | null, baseIdentity: number | null}>} players 永久玩家快照。
 * @property {number} currentRound 当前轮次。
 * @property {{players: Array<{id: number, name: string, isAlive: boolean, faction: FactionType | '???', identity: number | null, handCards: NinjaCard[], passiveCard: NinjaCard | null, revealedFaction: boolean}>, discardCount: number} | null} roundState 本轮快照。
 * @property {string} currentPhase 当前流程阶段。
 */

/**
 * @class NinjaGame
 * @description 忍者之夜核心引擎，负责局初始化、轮次驱动、夜晚结算与最终计分。
 * @example
 * const NinjaGame = require('./game');
 * const game = new NinjaGame();
 * game.runFullGame(6, ['甲', '乙', '丙', '丁', '戊', '己']).then((state) => {
 *   console.log(state.currentRound);
 * });
 */
class NinjaGame {
    /**
     * @constructor
     * @description 创建游戏实例并初始化全局流程字段，尚未创建实际玩家。
     */
    constructor() {
        /** @type {PlayerBase[]} 永久玩家列表，跨轮次保留。 */
        this.players = [];
        /** @type {string} 当前阶段标记。 */
        this.currentPhase = 'waiting';
        /** @type {number} 当前轮次编号。 */
        this.roundNumber = 0;
        /** @type {NinjaCard[]} 全局牌库，仅用于每轮复制与洗牌。 */
        this.globalDeck = [];
        /** @type {RoundState | null} 当前轮状态，为 null 表示尚未开轮。 */
        this.roundState = null;
        /**
         * @type {Array<{time?: string, action: string, actorId?: number, targetId?: number}>}
         * @deprecated 当前版本未使用该日志字段，建议后续统一接入专用事件总线。
         */
        this.actionLog = [];
        /** @type {PhaseType[]} 夜晚主动阶段执行顺序。 */
        this.phaseOrder = [PhaseEnum.SPY, PhaseEnum.HERMIT, PhaseEnum.TRICKSTER, PhaseEnum.BLIND_ASSASSIN, PhaseEnum.JONIN, PhaseEnum.PASSIVE];
    }

    /**
     * @description 初始化整局游戏，创建玩家、分配阵营身份并生成全局牌库。
     * @param {number} playerCount 玩家人数，允许区间为 4-11。
     * @param {string[]} [playerNames=[]] 玩家名称数组，未提供时自动生成人名。
     * @returns {GameStateSnapshot} 初始化完成后的状态快照。
     * @throws {Error} 当玩家人数不在 4-11 区间时抛出。
     * @throws {Error} 规避方式：调用前先校验人数合法再执行初始化。
     * @example
     * const game = new NinjaGame();
     * const state = game.initGame(6, ['甲', '乙', '丙', '丁', '戊', '己']);
     * console.log(state.players.length); // 6
     */
    initGame(playerCount, playerNames = []) {
        if (playerCount < 4 || playerCount > 11) {
            throw new Error('游戏人数必须在4-11人之间');
        }

        // 创建玩家(永久数据:荣誉和基础信息)
        this.players = [];
        for (let i = 0; i < playerCount; i++) {
            this.players.push({
                id: i,
                name: playerNames[i] || `玩家${i + 1}`,
                honorTokens: 0,         // 永久荣誉
                honorMarkers: [],        // 永久荣誉标记(如[2,3,4])
                baseFaction: null,       // 基础流派(每轮固定)
                baseIdentity: null        // 基础身份(每轮固定)
                // 注意:被动技能牌现在从牌库抽取,不再预先分配
            });
        }

        // 分配基础流派和身份(每轮固定)
        this.assignFactionsAndIdentities(playerCount);

        // 初始化全局牌库(所有忍者牌)
        this.initGlobalDeck();

        this.currentPhase = 'round_start';
        this.roundNumber = 1;

        console.log('游戏初始化完成');
        return this.getGameState();
    }

    /**
     * @description 按人数分配基础流派与身份号，写入永久玩家数据。
     * @param {number} playerCount 玩家人数。
     * @returns {void} 无返回值。
     */
    assignFactionsAndIdentities(playerCount) {
        const factions = [];
        const isOdd = playerCount % 2 === 1;

        // 奇数玩家时加入浪人
        if (isOdd) {
            factions.push(FactionEnum.RONIN);
        }

        // 分配莲花派和仙鹤派
        const halfCount = Math.floor(playerCount / 2);
        for (let i = 0; i < halfCount; i++) {
            factions.push(FactionEnum.LOTUS, FactionEnum.CRANE);
        }

        // 打乱顺序
        this.shuffleArray(factions);

        // 分配基础流派
        this.players.forEach((player, index) => {
            player.baseFaction = factions[index];
        });

        // 为莲花派和仙鹤派分配1-5号身份
        [FactionEnum.LOTUS, FactionEnum.CRANE].forEach(faction => {
            const factionPlayers = this.players.filter(p => p.baseFaction === faction);
            const identities = this.shuffleArray([1, 2, 3, 4, 5].slice(0, factionPlayers.length));

            factionPlayers.forEach((player, idx) => {
                player.baseIdentity = identities[idx];
            });
        });

        // 浪人没有身份数字
        this.players.filter(p => p.baseFaction === FactionEnum.RONIN).forEach(p => {
            p.baseIdentity = null;
        });
    }

    /**
     * @description 初始化全局牌库，收集所有忍者牌模板。
     * @returns {void} 无返回值。
     */
    initGlobalDeck() {
        this.globalDeck = [];

        // 将所有忍者牌加入全局牌库
        Object.values(ninjaCards).forEach(cardArray => {
            this.globalDeck.push(...cardArray);
        });

        console.log(`全局牌库初始化完成,共有 ${this.globalDeck.length} 张忍者牌`);
    }

    /**
     * @description 开始新的一轮并重建轮次状态，包括玩家快照、牌堆与弃牌堆。
     * @returns {RoundState} 当前轮的新状态对象。
     */
    startNewRound() {
        console.log(`\n===== 开始第${this.roundNumber}轮 =====`);

        // 创建本轮状态(完全独立)
        this.roundState = {
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                // 从基础数据复制,但每轮独立
                faction: p.baseFaction,
                identity: p.baseIdentity,
                isAlive: true,                          // 本轮存活状态
                handCards: [],                           // 本轮手牌
                revealedFaction: false,                   // 本轮是否被揭示
                honorTokensThisRound: 0,                   // 本轮获得的荣誉(用于记录)
                draftCards: null,                          // 轮抽临时存储
                selectedCard: null,                         // 轮抽选择的牌
                passCards: null,                             // 轮抽要传递的牌
                passiveCard: null                            // 本轮获得的被动技能牌(从牌库抽取)
            })),
            deck: this.shuffleArray([...this.globalDeck.map(card => ({
                ...card,
                id: this.generateUniqueId(card.id)
            }))]), // 全新的洗混牌库(深拷贝,确保ID唯一)
            discardPile: [],                               // 本轮弃牌堆
            phaseIndex: 0,                                  // 当前阶段索引
            roundWinner: null                               // 本轮获胜方
        };

        console.log(`本轮牌库数量: ${this.roundState.deck.length} 张忍者牌`);

        this.currentPhase = 'draft';
        return this.roundState;
    }

    /**
     * @description 为卡牌拷贝生成轮次内唯一 ID，避免同名牌冲突。
     * @param {number | string} originalId 原始卡牌 ID。
     * @returns {string} 拼接后的唯一 ID。
     */
    generateUniqueId(originalId) {
        return `${originalId}-${this.roundNumber}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * @async
     * @description 执行轮抽阶段：每位存活玩家抽 3 张牌并进入同步选牌流程。
     * @returns {Promise<void>} 异步完成后无返回值。
     * @throws {Error} 当本轮牌堆不足以给所有玩家抽取时抛出。
     * @throws {Error} 规避方式：确保牌库初始化完整且人数配置合理。
     */
    async draftPhase() {
        console.log(`\n===== 第${this.roundNumber}轮 轮抽阶段 =====`);

        const alivePlayers = this.roundState.players.filter(p => p.isAlive);

        // 每个玩家抽3张牌(从本轮独立的牌库)
        for (const player of alivePlayers) {
            if (this.roundState.deck.length < 3) {
                throw new Error('牌库牌数不足');
            }
            const drawnCards = this.roundState.deck.splice(0, 3);
            player.draftCards = drawnCards; // 临时存储待选择的牌
            console.log(`${player.name} 抽到3张牌:`,
                drawnCards.map(c => `${c.name}(序号${c.value})`));
        }

        // 执行同步轮抽
        await this.executeSynchronousDraft(alivePlayers);

        this.currentPhase = 'night_start';
    }

    /**
     * @async
     * @description 执行同步轮抽：第一轮保留并传递，第二轮保留并弃置。
     * @param {RoundPlayer[]} players 本轮参与轮抽的存活玩家。
     * @returns {Promise<void>} 异步完成后无返回值。
     * @example
     * await game.executeSynchronousDraft(game.roundState.players.filter(p => p.isAlive));
     */
    async executeSynchronousDraft(players) {
        console.log(`\n--- 开始同步轮抽 ---`);

        // 第一轮:所有玩家从3张牌中选择1张保留
        console.log(`\n第一轮选择:从3张牌中选择1张保留`);

        // 所有玩家同时选择(这里用随机模拟)
        for (const player of players) {
            if (!player.draftCards || player.draftCards.length !== 3) {
                console.log(`${player.name} 没有3张牌可选`);
                continue;
            }

            // 模拟玩家从3张中选择1张保留
            const keepIndex = Math.floor(Math.random() * 3);
            const keepCard = player.draftCards[keepIndex];

            // 第一轮保留牌应立即加入手牌
            player.handCards.push(keepCard);

            // 第一轮如果拿到被动牌,需要记录被动技能
            if (keepCard.isPassive) {
                player.passiveCard = keepCard;
            }

            // 记录选择的牌和剩余要传递的牌
            player.selectedCard = keepCard;
            player.passCards = player.draftCards.filter((_, idx) => idx !== keepIndex);

            console.log(`${player.name} 选择保留: ${keepCard.name}, 准备传递:`,
                player.passCards.map(c => `${c.name}`).join(', '));
        }

        // 所有玩家同时传递剩余2张牌给下家
        console.log(`\n--- 第一轮传递 ---`);
        const passResults = [];

        for (let i = 0; i < players.length; i++) {
            const currentPlayer = players[i];
            const nextPlayer = players[(i + 1) % players.length]; // 向右传递

            // 记录传递结果
            passResults.push({
                from: currentPlayer,
                to: nextPlayer,
                cards: [...currentPlayer.passCards]
            });
        }

        // 执行传递
        for (const pass of passResults) {
            // 清空接收者的draftCards,准备接收新牌
            pass.to.draftCards = pass.cards;
            console.log(`${pass.from.name} 传递给 ${pass.to.name}:`,
                pass.cards.map(c => `${c.name}`).join(', '));
        }

        // 清空临时数据
        for (const player of players) {
            delete player.selectedCard;
            delete player.passCards;
        }

        // 第二轮:所有玩家从收到的2张牌中选择1张保留
        console.log(`\n第二轮选择:从收到的2张牌中选择1张保留`);

        for (const player of players) {
            if (!player.draftCards || player.draftCards.length !== 2) {
                console.log(`${player.name} 没有收到2张牌`);
                continue;
            }

            // 模拟玩家从2张中选择1张保留
            const keepIndex = Math.floor(Math.random() * 2);
            const keepCard = player.draftCards[keepIndex];

            // 将保留的牌加入手牌
            player.handCards.push(keepCard);

            // 如果是被动牌,设置玩家的被动技能
            if (keepCard.isPassive) {
                player.passiveCard = keepCard;
                console.log(`${player.name} 获得被动技能: ${keepCard.name}`);
            }

            // 剩余1张要弃置
            const discardCard = player.draftCards.filter((_, idx) => idx !== keepIndex)[0];

            console.log(`${player.name} 选择保留: ${keepCard.name}${keepCard.isPassive ? '(被动)' : ''}, 弃置: ${discardCard.name}${discardCard.isPassive ? '(被动)' : ''}`);

            // 弃置剩余牌
            this.roundState.discardPile.push(discardCard);
        }

        // 清理draftCards
        for (const player of players) {
            delete player.draftCards;
        }

        console.log(`\n轮抽结束,每位玩家手牌:`);
        players.forEach(p => {
            const handCardsStr = p.handCards.map(c => `${c.name}${c.isPassive ? '(被动)' : ''}`).join(', ');
            console.log(`  ${p.name}: ${handCardsStr}${p.passiveCard ? ` [被动:${p.passiveCard.name}]` : ''}`);
        });
        console.log(`弃牌堆现有 ${this.roundState.discardPile.length} 张牌`);
    }

    /**
     * @async
     * @description 执行夜晚阶段，按固定顺序触发主动技能并检测提前结束。
     * @returns {Promise<void>} 异步完成后无返回值。
     */
    async executeNightPhase() {
        console.log(`\n===== 第${this.roundNumber}轮 夜晚阶段 =====`);

        const earlyCheckAtStart = this.checkEarlyRoundEnd();
        if (earlyCheckAtStart.shouldEnd) {
            console.log(`夜晚阶段提前结束: ${earlyCheckAtStart.reason}`);
            return;
        }

        // 先执行主动技能阶段(密探、隐士、骗徒、盲眼刺客、上忍)
        for (const phase of this.phaseOrder.filter(p => p !== PhaseEnum.PASSIVE)) {
            console.log(`\n--- ${this.getPhaseDisplayName(phase)}阶段 ---`);

            // 获取存活且有此类手牌的玩家(排除被动牌)
            const activePlayers = this.roundState.players.filter(p =>
                p.isAlive && p.handCards.some(c => c.type === phase && !c.isPassive)
            );

            // 按卡牌数字从小到大排序
            const sortedPlayers = activePlayers.sort((a, b) => {
                const aCard = a.handCards.find(c => c.type === phase && !c.isPassive);
                const bCard = b.handCards.find(c => c.type === phase && !c.isPassive);
                return aCard.value - bCard.value;
            });

            const phaseActions = sortedPlayers.map(player => ({
                player,
                card: player.handCards.find(c => c.type === phase && !c.isPassive)
            }));

            if (phaseActions.length === 0) {
                console.log('本阶段无可执行玩家');
                continue;
            }

            console.log('本阶段手牌揭示(按执行顺序):');
            phaseActions.forEach((action, index) => {
                console.log(`  ${index + 1}. ${action.player.name} -> ${action.card.name}(序号${action.card.value})`);
            });

            // 按顺序执行每个玩家的行动
            for (const action of phaseActions) {
                const player = action.player;
                const card = action.card;

                // 玩家可能在本阶段前面的行动中被击杀
                if (!player.isAlive) {
                    console.log(`${player.name} 已死亡,跳过本次行动`);
                    continue;
                }

                if (phase === PhaseEnum.TRICKSTER) {
                    // 骗徒阶段有特殊效果
                    await this.executeTricksterAction(player, card);
                } else {
                    // 其他阶段的基础行动
                    await this.executeBasicAction(player, card, phase);
                }

                // 使用过的牌进入弃牌堆
                this.roundState.discardPile.push(card);
                player.handCards = player.handCards.filter(c => c.id !== card.id);

                const earlyCheck = this.checkEarlyRoundEnd();
                if (earlyCheck.shouldEnd) {
                    console.log(`夜晚阶段提前结束: ${earlyCheck.reason}`);
                    return;
                }
            }
        }

        // 被动技能不需要执行,但可以在击杀时触发
        console.log(`\n--- 被动技能阶段(等待触发) ---`);
    }

    /**
     * @description 判定夜晚阶段是否应提前结束。
     * @returns {EarlyRoundEndResult} 包含是否结束及原因。
     */
    checkEarlyRoundEnd() {
        const alivePlayers = this.roundState.players.filter(p => p.isAlive);

        if (alivePlayers.length <= 1) {
            return {
                shouldEnd: true,
                reason: '场上仅1人存活'
            };
        }

        const aliveFactions = new Set(alivePlayers.map(p => p.faction));
        if (aliveFactions.size === 1) {
            const [faction] = [...aliveFactions];
            const factionName = faction === FactionEnum.LOTUS ? '莲花派' : faction === FactionEnum.CRANE ? '仙鹤派' : '浪人';
            return {
                shouldEnd: true,
                reason: `场上仅剩单一阵营(${factionName})`
            };
        }

        return {
            shouldEnd: false,
            reason: ''
        };
    }

    /**
     * @async
     * @description 执行基础行动（密探、隐士、盲眼刺客、上忍）的通用逻辑。
     * @param {RoundPlayer} player 行动玩家。
     * @param {NinjaCard} card 当前使用的卡牌。
     * @param {PhaseType} phase 当前阶段类型。
     * @returns {Promise<void>} 异步完成后无返回值。
     */
    async executeBasicAction(player, card, phase) {
        console.log(`${player.name} 使用 ${card.name}`);

        // 实际游戏中这里需要前端选择目标,这里简化处理
        const target = this.getRandomTarget(player);
        if (!target) {
            console.log(`${player.name} 没有可选目标,行动跳过`);
            return;
        }

        switch (phase) {
            case PhaseEnum.SPY:
                // 查看流派
                console.log(`${player.name} 查看了 ${target.name} 的流派: ${target.faction === FactionEnum.LOTUS ? '莲花派' : target.faction === FactionEnum.CRANE ? '仙鹤派' : '浪人'}`);
                break;

            case PhaseEnum.HERMIT:
                // 查看流派和一张手牌
                const randomCard = target.handCards[Math.floor(Math.random() * target.handCards.length)];
                console.log(`${player.name} 查看了 ${target.name} 的流派: ${target.faction === FactionEnum.LOTUS ? '莲花派' : target.faction === FactionEnum.CRANE ? '仙鹤派' : '浪人'} 和手牌: ${randomCard?.name}`);
                break;

            case PhaseEnum.BLIND_ASSASSIN:
                // 尝试击杀
                await this.attemptKill(player, target, card);
                break;

            case PhaseEnum.JONIN:
                // 查看身份后决定是否击杀
                console.log(`${player.name} 查看了 ${target.name} 的身份: ${target.identity || '浪人'}`);

                // 50%概率决定击杀(实际应由玩家选择)
                if (Math.random() > 0.5) {
                    await this.attemptKill(player, target, card);
                }
                break;
        }
    }

    /**
     * @async
     * @description 根据骗徒牌序号分派对应的特殊行动。
     * @param {RoundPlayer} player 行动玩家。
     * @param {NinjaCard} card 骗徒牌。
     * @returns {Promise<void>} 异步完成后无返回值。
     */
    async executeTricksterAction(player, card) {
        console.log(`${player.name} 使用 ${card.name} - ${card.description}`);

        switch (card.value) {
            case 1: // 百变者
                await this.tricksterShapeshifter(player);
                break;
            case 2: // 掘墓人
                await this.tricksterGravedigger(player);
                break;
            case 3: // 捣蛋鬼
                await this.tricksterTroublemaker(player);
                break;
            case 4: // 灵魂商贩
                await this.tricksterSoulMerchant(player);
                break;
            case 5: // 窃贼
                await this.tricksterThief(player);
                break;
            case 6: // 裁判
                await this.tricksterJudge(player, card);
                break;
        }
    }

    /**
     * @async
     * @description 百变者效果：查看两名玩家流派并可交换其流派。
     * @param {RoundPlayer} player 行动玩家。
     * @returns {Promise<void>} 异步完成后无返回值。
     */
    async tricksterShapeshifter(player) {
        const targets = this.getRandomTargets(player, 2);
        if (targets.length < 2) {
            console.log(`${player.name} 可选目标不足2人,百变者效果跳过`);
            return;
        }
        console.log(`${player.name} 查看了 ${targets[0].name}(${targets[0].faction === FactionEnum.LOTUS ? '莲花派' : targets[0].faction === FactionEnum.CRANE ? '仙鹤派' : '浪人'}) 和 ${targets[1].name}(${targets[1].faction === FactionEnum.LOTUS ? '莲花派' : targets[1].faction === FactionEnum.CRANE ? '仙鹤派' : '浪人'}) 的流派`);

        // 50%概率交换(实际应由玩家选择)
        if (Math.random() > 0.5) {
            [targets[0].faction, targets[1].faction] = [targets[1].faction, targets[0].faction];
            console.log(`交换了 ${targets[0].name} 和 ${targets[1].name} 的流派`);
        }
    }

    /**
     * @async
     * @description 掘墓人效果：查看弃牌堆中两张牌并获取其中一张。
     * @param {RoundPlayer} player 行动玩家。
     * @returns {Promise<void>} 异步完成后无返回值。
     */
    async tricksterGravedigger(player) {
        if (this.roundState.discardPile.length === 0) {
            console.log('弃牌堆为空');
            return;
        }

        // 随机看2张弃牌
        const availableCards = this.shuffleArray([...this.roundState.discardPile]).slice(0, 2);
        console.log(`${player.name} 查看了弃牌堆:`, availableCards.map(c => c.name));

        // 拿去其中1张(简化:拿第一张)
        const takenCard = { ...availableCards[0], id: this.generateUniqueId(availableCards[0].id) }; // 拷贝一份,生成新ID
        this.roundState.discardPile = this.roundState.discardPile.filter(c => c.id !== availableCards[0].id);

        // 50%概率立即使用(简化)
        if (Math.random() > 0.5) {
            console.log(`${player.name} 立即使用 ${takenCard.name}`);
            await this.executeBasicAction(player, takenCard, takenCard.type);
        } else {
            player.handCards.push(takenCard);
            console.log(`${player.name} 将 ${takenCard.name} 加入手牌`);
        }
    }

    /**
     * @async
     * @description 捣蛋鬼效果：查看目标流派并可公开其流派。
     * @param {RoundPlayer} player 行动玩家。
     * @returns {Promise<void>} 异步完成后无返回值。
     */
    async tricksterTroublemaker(player) {
        const target = this.getRandomTarget(player);
        if (!target) {
            console.log(`${player.name} 没有可选目标,捣蛋鬼效果跳过`);
            return;
        }
        console.log(`${player.name} 查看了 ${target.name} 的流派: ${target.faction === FactionEnum.LOTUS ? '莲花派' : target.faction === FactionEnum.CRANE ? '仙鹤派' : '浪人'}`);

        // 50%概率揭示(实际应由玩家选择)
        if (Math.random() > 0.5) {
            target.revealedFaction = true;
            console.log(`${player.name} 揭示了 ${target.name} 的流派: ${target.faction === FactionEnum.LOTUS ? '莲花派' : target.faction === FactionEnum.CRANE ? '仙鹤派' : '浪人'}`);
        }
    }

    /**
     * @async
     * @description 灵魂商贩效果：查看目标信息并尝试交换荣誉标记。
     * @param {RoundPlayer} player 行动玩家。
     * @returns {Promise<void>} 异步完成后无返回值。
     */
    async tricksterSoulMerchant(player) {
        const target = this.getRandomTarget(player);
        if (!target) {
            console.log(`${player.name} 没有可选目标,灵魂商贩效果跳过`);
            return;
        }

        // 随机决定查看荣誉或流派
        if (Math.random() > 0.5) {
            console.log(`${player.name} 查看了 ${target.name} 的荣誉标记: ${target.honorTokensThisRound || 0}`);
        } else {
            console.log(`${player.name} 查看了 ${target.name} 的流派: ${target.faction === FactionEnum.LOTUS ? '莲花派' : target.faction === FactionEnum.CRANE ? '仙鹤派' : '浪人'}`);
        }

        // 50%概率交换1个荣誉(注意这里是永久荣誉)
        if (Math.random() > 0.5) {
            const originalPlayer = this.players.find(p => p.id === player.id);
            const originalTarget = this.players.find(p => p.id === target.id);

            if (originalTarget.honorTokens > 0) {
                const movedMarker = this.removeRandomHonorMarker(originalTarget);
                if (movedMarker > 0) {
                    this.addHonorMarker(originalPlayer, movedMarker);
                    console.log(`${player.name} 从 ${target.name} 交换了1个荣誉标记(分值${movedMarker})`);
                }
            }
        }
    }

    /**
     * @async
     * @description 窃贼效果：公开自己流派并从荣誉更高玩家处盗取标记。
     * @param {RoundPlayer} player 行动玩家。
     * @returns {Promise<void>} 异步完成后无返回值。
     */
    async tricksterThief(player) {
        player.revealedFaction = true;
        console.log(`${player.name} 揭示了流派: ${player.faction === FactionEnum.LOTUS ? '莲花派' : player.faction === FactionEnum.CRANE ? '仙鹤派' : '浪人'}`);

        // 找荣誉比玩家多且本轮仍存活的玩家(使用永久荣誉)
        const originalPlayer = this.players.find(p => p.id === player.id);
        const aliveIds = new Set(this.roundState.players.filter(p => p.isAlive).map(p => p.id));
        const richerPlayers = this.players.filter(p =>
            aliveIds.has(p.id) && p.id !== player.id && p.honorTokens > originalPlayer.honorTokens
        );

        if (richerPlayers.length > 0) {
            const target = richerPlayers[0]; // 简化:选第一个
            const stolenMarker = this.removeRandomHonorMarker(target);
            if (stolenMarker > 0) {
                this.addHonorMarker(originalPlayer, stolenMarker);
                console.log(`${player.name} 从 ${target.name} 偷了1个荣誉标记(分值${stolenMarker})`);
            }
        }
    }

    /**
     * @async
     * @description 裁判效果：公开自己流派并强制击杀目标，忽略反制被动。
     * @param {RoundPlayer} player 行动玩家。
     * @param {NinjaCard} card 裁判卡牌。
     * @returns {Promise<void>} 异步完成后无返回值。
     */
    async tricksterJudge(player, card) {
        player.revealedFaction = true;
        console.log(`${player.name} 揭示了流派: ${player.faction === FactionEnum.LOTUS ? '莲花派' : player.faction === FactionEnum.CRANE ? '仙鹤派' : '浪人'}`);

        const target = this.getRandomTarget(player);
        if (!target) {
            console.log(`${player.name} 没有可选目标,裁判效果跳过`);
            return;
        }
        console.log(`${player.name} 尝试击杀 ${target.name}`);

        // 裁判效果无视还施僧和殉道者
        if (target.passiveCard && (target.passiveCard.name === '还施僧' || target.passiveCard.name === '殉道者')) {
            console.log(`${target.name} 的被动技能【${target.passiveCard.name}】被裁判无视`);
        }

        target.isAlive = false;
        console.log(`${target.name} 被击杀`);
    }

    /**
     * @async
     * @description 尝试执行击杀，并处理还施僧/殉道者等被动反制逻辑。
     * @param {RoundPlayer} attacker 攻击方玩家。
     * @param {RoundPlayer} target 防守方玩家。
     * @param {NinjaCard} card 触发击杀的卡牌。
     * @returns {Promise<void>} 异步完成后无返回值。
     */
    async attemptKill(attacker, target, card) {
        console.log(`${attacker.name} 尝试击杀 ${target.name}`);

        // 检查目标是否有被动技能
        if (target.passiveCard) {
            switch (target.passiveCard.name) {
                case '还施僧':
                    console.log(`${target.name} 触发【还施僧】,反杀 ${attacker.name}`);
                    attacker.isAlive = false;
                    // 还施僧的牌进入弃牌堆(已使用)
                    this.roundState.discardPile.push(target.passiveCard);
                    target.passiveCard = null;
                    return;

                case '殉道者':
                    console.log(`${target.name} 触发【殉道者】,获得1荣誉后死亡`);
                    // 给玩家增加永久荣誉
                    const originalTarget = this.players.find(p => p.id === target.id);
                    this.addHonorMarker(originalTarget, 1);
                    target.isAlive = false;
                    // 殉道者的牌进入弃牌堆(已使用)
                    this.roundState.discardPile.push(target.passiveCard);
                    target.passiveCard = null;
                    return;
            }
        }

        // 无被动技能或技能不触发
        target.isAlive = false;
        console.log(`${target.name} 被击杀`);
    }

    /**
     * @description 执行揭示阶段，依据存活身份序列与首脑效果判定本轮胜方。
     * @returns {FactionType} 本轮获胜阵营。
     * @example
     * const winner = game.executeRevealPhase();
     * console.log(winner); // 'lotus' | 'crane' | 'ronin'
     */
    executeRevealPhase() {
        console.log(`\n===== 揭示阶段 =====`);

        // 重置揭示状态
        this.roundState.players.forEach(p => p.revealedFaction = false);

        // 存活玩家
        const alivePlayers = this.roundState.players.filter(p => p.isAlive);

        // 按流派分组并获取身份
        const lotusPlayers = alivePlayers.filter(p => p.faction === FactionEnum.LOTUS);
        const cranePlayers = alivePlayers.filter(p => p.faction === FactionEnum.CRANE);
        const roninPlayers = alivePlayers.filter(p => p.faction === FactionEnum.RONIN);

        // 获取存活身份并排序
        const lotusIdentities = lotusPlayers.map(p => p.identity).filter(id => id !== null).sort((a, b) => a - b);
        const craneIdentities = cranePlayers.map(p => p.identity).filter(id => id !== null).sort((a, b) => a - b);

        console.log('莲花派存活身份:', lotusIdentities);
        console.log('仙鹤派存活身份:', craneIdentities);

        // 检查首脑被动技能
        const lotusLeader = lotusPlayers.find(p => p.passiveCard?.name === '首脑' && p.isAlive);
        const craneLeader = cranePlayers.find(p => p.passiveCard?.name === '首脑' && p.isAlive);

        // 判断本局胜者
        let winnerFaction;

        if (lotusLeader) {
            console.log('莲花派首脑存活,莲花派自动获胜');
            winnerFaction = FactionEnum.LOTUS;
        } else if (craneLeader) {
            console.log('仙鹤派首脑存活,仙鹤派自动获胜');
            winnerFaction = FactionEnum.CRANE;
        } else {
            winnerFaction = this.determineWinner(lotusIdentities, craneIdentities);
        }

        // 检查浪人特殊胜利
        if (roninPlayers.length > 0 && roninPlayers[0].isAlive) {
            const lotusHas1 = lotusIdentities.includes(1);
            const craneHas1 = craneIdentities.includes(1);

            // 如果浪人存活且双方1号都被击杀
            if (!lotusHas1 && !craneHas1) {
                console.log('🎯 浪人单独获胜！');
                winnerFaction = FactionEnum.RONIN;
            }
        }

        console.log(`本轮获胜方: ${winnerFaction === FactionEnum.LOTUS ? '莲花派' : winnerFaction === FactionEnum.CRANE ? '仙鹤派' : '浪人'}`);

        this.roundState.roundWinner = winnerFaction;
        return winnerFaction;
    }

    /**
     * @description 按身份号从小到大比较，判定莲花派与仙鹤派胜负。
     * @param {number[]} lotusIds 莲花派存活身份数组。
     * @param {number[]} craneIds 仙鹤派存活身份数组。
     * @returns {FactionType} 仅返回 lotus 或 crane。
     */
    determineWinner(lotusIds, craneIds) {
        if (lotusIds.length === 0) return FactionEnum.CRANE;
        if (craneIds.length === 0) return FactionEnum.LOTUS;

        const minLength = Math.min(lotusIds.length, craneIds.length);

        for (let i = 0; i < minLength; i++) {
            if (lotusIds[i] < craneIds[i]) {
                return FactionEnum.LOTUS;
            } else if (craneIds[i] < lotusIds[i]) {
                return FactionEnum.CRANE;
            }
        }

        // 所有比较都相等,则人数多的胜
        return lotusIds.length > craneIds.length ? FactionEnum.LOTUS : FactionEnum.CRANE;
    }

    /**
     * @description 执行计分并检查是否达到整局终局条件（任意玩家荣誉 >= 10）。
     * @param {FactionType} winnerFaction 本轮获胜阵营。
     * @returns {boolean} `true` 表示整局结束，`false` 表示继续下一轮。
     */
    scoringPhase(winnerFaction) {
        console.log(`\n===== 计分阶段 =====`);

        // 获胜方所有成员(包括已淘汰)获得荣誉
        this.roundState.players.forEach(roundPlayer => {
            if (roundPlayer.faction === winnerFaction) {
                // 找到对应的永久玩家
                const permanentPlayer = this.players.find(p => p.id === roundPlayer.id);
                const roundScore = this.drawRoundScore();
                this.addHonorMarker(permanentPlayer, roundScore);
                roundPlayer.honorTokensThisRound = (roundPlayer.honorTokensThisRound || 0) + roundScore;
                console.log(`${roundPlayer.name} +${roundScore}荣誉,当前总荣誉: ${permanentPlayer.honorTokens}`);
            }
        });

        // 检查是否有玩家达到10分
        const winners = this.players.filter(p => p.honorTokens >= 10);
        if (winners.length > 0) {
            console.log('\n🏆 游戏结束！获胜玩家:');

            // 找出最高分
            const maxScore = Math.max(...winners.map(w => w.honorTokens));
            const finalWinners = winners.filter(w => w.honorTokens === maxScore);

            finalWinners.forEach(w =>
                console.log(`${w.name} 获得 ${w.honorTokens} 荣誉${finalWinners.length > 1 ? ' (共享胜利)' : ''}`)
            );

            return true;
        }

        return false;
    }

    /**
     * @description 按概率抽取本轮荣誉分值：2 分(30%)、3 分(50%)、4 分(20%)。
     * @returns {number} 抽取得到的荣誉分值。
     */
    drawRoundScore() {
        const r = Math.random();
        if (r < 0.3) return 2;
        if (r < 0.8) return 3;
        return 4;
    }

    /**
     * @description 给玩家添加一枚荣誉标记并同步累计荣誉。
     * @param {PlayerBase} player 永久玩家对象。
     * @param {number} markerValue 荣誉标记分值。
     * @returns {void} 无返回值。
     */
    addHonorMarker(player, markerValue) {
        if (!Array.isArray(player.honorMarkers)) {
            player.honorMarkers = [];
        }
        player.honorMarkers.push(markerValue);
        player.honorTokens += markerValue;
    }

    /**
     * @description 从玩家荣誉标记中随机移除一枚并同步总分，兼容旧版数据。
     * @param {PlayerBase} player 永久玩家对象。
     * @returns {number} 被移除的标记分值；未移除时返回 0。
     */
    removeRandomHonorMarker(player) {
        if (Array.isArray(player.honorMarkers) && player.honorMarkers.length > 0) {
            const index = Math.floor(Math.random() * player.honorMarkers.length);
            const markerValue = player.honorMarkers.splice(index, 1)[0];
            player.honorTokens -= markerValue;
            return markerValue;
        }

        // 兼容旧数据:若只有总分没有标记数组,按1分标记处理
        if (player.honorTokens > 0) {
            player.honorTokens -= 1;
            return 1;
        }

        return 0;
    }

    /**
     * @description 清理当前轮状态并推进轮次编号。
     * @returns {void} 无返回值。
     */
    cleanupRound() {
        console.log(`\n===== 清理第${this.roundNumber}轮数据 =====`);

        // 本轮所有玩家的手牌和被动牌都弃置(但不需要保留,因为下一轮会用全新的牌库)

        // 重置本轮状态
        this.roundState = null;
        this.roundNumber++;
    }

    /**
     * @async
     * @description 运行完整一局游戏，循环执行轮抽、夜晚、揭示、计分直到终局。
     * @param {number} [playerCount=6] 玩家人数。
     * @param {string[]} [playerNames=[]] 玩家名数组。
     * @returns {Promise<GameStateSnapshot>} 终局后的游戏状态快照。
     * @default playerCount 6
     * @default playerNames []
     * @example
     * const game = new NinjaGame();
     * const finalState = await game.runFullGame(6, ['甲', '乙', '丙', '丁', '戊', '己']);
     * console.log(finalState.players.map(p => p.honorTokens));
     */
    async runFullGame(playerCount = 6, playerNames = []) {
        // 初始化
        this.initGame(playerCount, playerNames);

        let gameOver = false;

        // 进行多轮直到游戏结束
        while (!gameOver) {
            // 开始新的一轮(重置所有轮次数据)
            this.startNewRound();

            // 轮抽阶段
            await this.draftPhase();

            // 夜晚阶段
            await this.executeNightPhase();

            // 揭示阶段
            const winner = this.executeRevealPhase();

            // 计分阶段
            gameOver = this.scoringPhase(winner);

            // 清理本轮数据
            this.cleanupRound();
        }

        return this.getGameState();
    }

    /**
     * @description 获取一名随机存活目标（排除自己）。
     * @param {RoundPlayer} player 当前行动玩家。
     * @returns {RoundPlayer | null} 目标玩家；无可选目标时返回 null。
     */
    getRandomTarget(player) {
        const targets = this.roundState.players.filter(p => p.id !== player.id && p.isAlive);
        if (targets.length === 0) {
            return null;
        }
        return targets[Math.floor(Math.random() * targets.length)];
    }

    /**
     * @description 获取多名随机存活目标（排除自己）。
     * @param {RoundPlayer} player 当前行动玩家。
     * @param {number} count 目标数量。
     * @returns {RoundPlayer[]} 随机目标数组。
     */
    getRandomTargets(player, count) {
        const targets = this.roundState.players.filter(p => p.id !== player.id && p.isAlive);
        return this.shuffleArray(targets).slice(0, count);
    }

    /**
     * @description 获取前端可消费的游戏状态快照，隐藏未揭示流派。
     * @returns {GameStateSnapshot} 当前游戏状态。
     */
    getGameState() {
        return {
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                honorTokens: p.honorTokens,
                honorMarkers: p.honorMarkers,
                baseFaction: p.baseFaction,
                baseIdentity: p.baseIdentity
            })),
            currentRound: this.roundNumber,
            roundState: this.roundState ? {
                players: this.roundState.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    isAlive: p.isAlive,
                    faction: p.revealedFaction ? p.faction : '???',
                    identity: p.identity,
                    handCards: p.handCards,
                    passiveCard: p.passiveCard,
                    revealedFaction: p.revealedFaction
                })),
                discardCount: this.roundState.discardPile.length
            } : null,
            currentPhase: this.currentPhase
        };
    }

    /**
     * @description 获取阶段类型对应的中文展示名。
     * @param {PhaseType | string} phase 阶段类型。
     * @returns {string} 中文阶段名；未知类型时返回原值。
     */
    getPhaseDisplayName(phase) {
        const phaseNameMap = {
            [PhaseEnum.SPY]: '密探',
            [PhaseEnum.HERMIT]: '隐士',
            [PhaseEnum.TRICKSTER]: '骗徒',
            [PhaseEnum.BLIND_ASSASSIN]: '盲眼刺客',
            [PhaseEnum.JONIN]: '上忍',
            [PhaseEnum.PASSIVE]: '被动技能'
        };
        return phaseNameMap[phase] || phase;
    }

    /**
     * @description 原地洗牌算法（Fisher-Yates），用于随机打乱数组。
     * @template T
     * @param {T[]} array 待打乱数组。
     * @returns {T[]} 打乱后的同一数组引用。
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    pasd() { }
}

module.exports = NinjaGame;