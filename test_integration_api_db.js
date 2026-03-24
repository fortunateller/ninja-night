const http = require('http');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');
require('dotenv').config();

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.API_HOST || '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function requestJson(method, path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const payload = body ? JSON.stringify(body) : null;

        const req = http.request(
            {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port,
                method,
                path: `${url.pathname}${url.search}`,
                headers: {
                    'Content-Type': 'application/json',
                    ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
                }
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => {
                    raw += chunk;
                });
                res.on('end', () => {
                    let parsed = null;
                    try {
                        parsed = raw ? JSON.parse(raw) : null;
                    } catch (error) {
                        return reject(new Error(`Invalid JSON response from ${method} ${path}: ${raw}`));
                    }

                    resolve({
                        statusCode: res.statusCode || 0,
                        body: parsed
                    });
                });
            }
        );

        req.on('error', reject);

        if (payload) {
            req.write(payload);
        }

        req.end();
    });
}

async function waitForHealth(timeoutMs = 30000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        try {
            const health = await requestJson('GET', '/health');
            if (health.statusCode === 200 && health.body?.ok === true) {
                return true;
            }
        } catch (_) {
            // Server not ready yet.
        }

        await sleep(500);
    }

    return false;
}

function startServerProcess() {
    const child = spawn(process.execPath, ['server.js'], {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => {
        process.stdout.write(`[server] ${chunk}`);
    });

    child.stderr.on('data', (chunk) => {
        process.stderr.write(`[server] ${chunk}`);
    });

    return child;
}

async function runIntegrationTest() {
    console.log('=== 集成测试: API -> MySQL ===');

    let startedServer = false;
    let serverProcess = null;
    let connection = null;

    try {
        const serverAlreadyUp = await waitForHealth(1500);

        if (!serverAlreadyUp) {
            console.log('未检测到 API 服务，自动启动 server.js ...');
            serverProcess = startServerProcess();
            startedServer = true;

            const ready = await waitForHealth(30000);
            assert(ready, 'API 服务启动超时，/health 未就绪');
        } else {
            console.log('检测到 API 服务已在运行，复用当前服务。');
        }

        const createRes = await requestJson('POST', '/api/matches', {
            playerNames: ['集成A', '集成B', '集成C', '集成D', '集成E', '集成F']
        });

        assert(createRes.statusCode === 201, `创建对局失败，状态码: ${createRes.statusCode}`);
        assert(createRes.body?.matchId, '创建对局成功但未返回 matchId');

        const matchId = createRes.body.matchId;
        console.log(`创建对局成功: ${matchId}`);

        const runRes = await requestJson('POST', `/api/matches/${matchId}/run-to-end`);
        assert(runRes.statusCode === 200, `run-to-end 失败，状态码: ${runRes.statusCode}`);

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await connection.execute(
            'SELECT id, status, state_json, metadata_json FROM matches WHERE id = ? LIMIT 1',
            [matchId]
        );

        assert(Array.isArray(rows) && rows.length === 1, `数据库未找到对局记录: ${matchId}`);

        const row = rows[0];
        assert(typeof row.state_json === 'string' && row.state_json.length > 0, 'state_json 为空');
        assert(typeof row.metadata_json === 'string' && row.metadata_json.length > 0, 'metadata_json 为空');

        const metadata = JSON.parse(row.metadata_json);
        const hasLogs = Array.isArray(metadata.logs) && metadata.logs.length > 0;
        assert(hasLogs, 'metadata.logs 为空，状态推进日志异常');

        console.log('API 调用与数据库落库验证通过。');
        console.log(`最终状态: status=${row.status}, logs=${metadata.logs.length}`);
        console.log('=== 集成测试通过 ===');
    } finally {
        if (connection) {
            await connection.end();
        }

        if (startedServer && serverProcess) {
            serverProcess.kill();
        }
    }
}

runIntegrationTest().catch((error) => {
    console.error('=== 集成测试失败 ===');
    console.error(error.message);
    process.exit(1);
});
