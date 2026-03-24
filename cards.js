// cards.js
/**
 * @enum {string}
 * @description 忍者牌类型枚举，用于标记技能类别与执行阶段。
 */
const NinjaCardTypeEnum = {
    /** 密探类型 */
    SPY: 'spy',
    /** 隐士类型 */
    HERMIT: 'hermit',
    /** 骗徒类型 */
    TRICKSTER: 'trickster',
    /** 盲眼刺客类型 */
    BLIND_ASSASSIN: 'blindAssassin',
    /** 上忍类型 */
    JONIN: 'jonin',
    /** 被动技能类型 */
    PASSIVE: 'passive'
};

/**
 * @typedef {'spy' | 'hermit' | 'trickster' | 'blindAssassin' | 'jonin' | 'passive'} NinjaCardType
 * @description 忍者牌类型联合定义。
 */

/**
 * @interface INinjaCard
 * @description 单张忍者牌接口定义。
 * @property {number} id 卡牌唯一编号。
 * @property {NinjaCardType} type 卡牌类型。
 * @property {number} value 卡牌序号/强度值。
 * @property {string} name 卡牌名称。
 * @property {string} description 卡牌效果描述。
 * @property {boolean} [isPassive] 是否为被动牌。
 */

/**
 * @typedef {Object} NinjaCard
 * @description 忍者牌类型别名。
 * @property {number} id 卡牌唯一编号。
 * @property {NinjaCardType} type 卡牌类型。
 * @property {number} value 卡牌序号/强度值。
 * @property {string} name 卡牌名称。
 * @property {string} description 卡牌效果描述。
 * @property {boolean} [isPassive] 是否为被动牌。
 */

/**
 * @constant
 * @type {{
 *   spy: NinjaCard[],
 *   hermit: NinjaCard[],
 *   trickster: NinjaCard[],
 *   blindAssassin: NinjaCard[],
 *   jonin: NinjaCard[],
 *   passive: NinjaCard[]
 * }}
 * @description 忍者之夜牌库定义常量，按类型组织全量卡牌数据。
 * @example
 * const { ninjaCards } = require('./cards');
 * console.log(ninjaCards.spy.length); // 6
 */
const ninjaCards = {
    // 密探 (6张)
    spy: [
        { id: 1, type: 'spy', value: 1, name: '密探·壹', description: '查看一名玩家的流派牌' },
        { id: 2, type: 'spy', value: 2, name: '密探·贰', description: '查看一名玩家的流派牌' },
        { id: 3, type: 'spy', value: 3, name: '密探·叁', description: '查看一名玩家的流派牌' },
        { id: 4, type: 'spy', value: 4, name: '密探·肆', description: '查看一名玩家的流派牌' },
        { id: 5, type: 'spy', value: 5, name: '密探·伍', description: '查看一名玩家的流派牌' },
        { id: 6, type: 'spy', value: 6, name: '密探·陆', description: '查看一名玩家的流派牌' }
    ],

    // 隐士 (6张)
    hermit: [
        { id: 7, type: 'hermit', value: 1, name: '隐士·壹', description: '查看一名玩家的流派牌及一张忍者牌' },
        { id: 8, type: 'hermit', value: 2, name: '隐士·贰', description: '查看一名玩家的流派牌及一张忍者牌' },
        { id: 9, type: 'hermit', value: 3, name: '隐士·叁', description: '查看一名玩家的流派牌及一张忍者牌' },
        { id: 10, type: 'hermit', value: 4, name: '隐士·肆', description: '查看一名玩家的流派牌及一张忍者牌' },
        { id: 11, type: 'hermit', value: 5, name: '隐士·伍', description: '查看一名玩家的流派牌及一张忍者牌' },
        { id: 12, type: 'hermit', value: 6, name: '隐士·陆', description: '查看一名玩家的流派牌及一张忍者牌' }
    ],

    // 骗徒 (6张特殊效果)
    trickster: [
        { id: 13, type: 'trickster', value: 1, name: '百变者', description: '查看2位玩家的流派牌后,你可以交换这两张牌' },
        { id: 14, type: 'trickster', value: 2, name: '掘墓人', description: '查看2张弃牌堆的忍者牌,并拿去其中1张,你可以选择立即使用该牌,或之后再使用' },
        { id: 15, type: 'trickster', value: 3, name: '捣蛋鬼', description: '查看1位玩家的流派牌,然后可以将其揭示' },
        { id: 16, type: 'trickster', value: 4, name: '灵魂商贩', description: '查看1位玩家的荣誉标记或流派牌,你可以与该玩家交换1个荣誉标记' },
        { id: 17, type: 'trickster', value: 5, name: '窃贼', description: '揭示你的流派牌。你可以从荣誉标记比你多的其中1位玩家那里拿去一个荣誉标记' },
        { id: 18, type: 'trickster', value: 6, name: '裁判', description: '揭示你的流派牌,并击杀1位玩家。裁判效果不受到【还施僧】和【殉道者】影响' }
    ],

    // 盲眼刺客 (6张)
    blindAssassin: [
        { id: 19, type: 'blindAssassin', value: 1, name: '盲眼刺客·壹', description: '击杀一名玩家' },
        { id: 20, type: 'blindAssassin', value: 2, name: '盲眼刺客·贰', description: '击杀一名玩家' },
        { id: 21, type: 'blindAssassin', value: 3, name: '盲眼刺客·叁', description: '击杀一名玩家' },
        { id: 22, type: 'blindAssassin', value: 4, name: '盲眼刺客·肆', description: '击杀一名玩家' },
        { id: 23, type: 'blindAssassin', value: 5, name: '盲眼刺客·伍', description: '击杀一名玩家' },
        { id: 24, type: 'blindAssassin', value: 6, name: '盲眼刺客·陆', description: '击杀一名玩家' }
    ],

    // 上忍 (6张)
    jonin: [
        { id: 25, type: 'jonin', value: 1, name: '上忍·壹', description: '查看一名玩家身份后决定是否击杀' },
        { id: 26, type: 'jonin', value: 2, name: '上忍·贰', description: '查看一名玩家身份后决定是否击杀' },
        { id: 27, type: 'jonin', value: 3, name: '上忍·叁', description: '查看一名玩家身份后决定是否击杀' },
        { id: 28, type: 'jonin', value: 4, name: '上忍·肆', description: '查看一名玩家身份后决定是否击杀' },
        { id: 29, type: 'jonin', value: 5, name: '上忍·伍', description: '查看一名玩家身份后决定是否击杀' },
        { id: 30, type: 'jonin', value: 6, name: '上忍·陆', description: '查看一名玩家身份后决定是否击杀' }
    ],

    // 被动技能牌 (3张)
    passive: [
        { id: 31, type: 'passive', value: 1, name: '首脑', description: '如果你在揭示阶段依然存活,你的流派赢得此轮胜利', isPassive: true },
        { id: 32, type: 'passive', value: 2, name: '还施僧', description: '当玩家使用上忍或盲眼刺客牌击杀你,你可以揭示此牌并反杀对方(你不会死亡)', isPassive: true },
        { id: 33, type: 'passive', value: 3, name: '殉道者', description: '当玩家使用上忍或盲眼刺客牌击杀你,你可以揭示此牌并获得1个荣誉标记(你依然会死亡)', isPassive: true }
    ]
};

module.exports = {
    ninjaCards
};