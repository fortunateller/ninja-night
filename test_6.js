// test.js
const NinjaGame = require('./game');

async function testGame() {
    console.log('=== 开始测试《忍者之夜》 ===\n');

    const game = new NinjaGame();

    // 测试6人局
    const playerNames = ['小明', '小红', '小刚', '小丽', '小强', '小美'];

    console.log(`\n🔰 测试 6 人局`);
    console.log('='.repeat(50));

    const gameState = await game.runFullGame(6, playerNames);

    // 打印最终结果
    console.log('\n📊 最终游戏状态:');
    gameState.players.forEach(p => {
        console.log(`${p.name}: 荣誉=${p.honorTokens}`);
    });

    console.log('='.repeat(50));
}

// 运行测试
testGame().catch(console.error);