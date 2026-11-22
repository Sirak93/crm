import { ChildProcess, spawn } from "child_process";
import * as net from "net";
import * as path from "path";
import { API_PATH } from "armstock-shared";
import { NodeEnv } from "../../../constants/NodeEnv";

const BACKEND_ROOT = path.join(__dirname, "..", "..", "..", "..");
const READY_TIMEOUT_MS = 60_000;
const LOG_TAIL_LINES = 25;

// Long enough that no token expires during a run.
const TOKEN_LIFETIME_SECONDS = "3600";

const freePort = (): Promise<number> =>
    new Promise((resolve, reject) => {
        const server = net.createServer();
        server.on("error", reject);
        server.listen(0, () => {
            const { port } = server.address() as net.AddressInfo;
            server.close(() => resolve(port));
        });
    });

/**
 * The backend under test: its own process on a free port, the scratch database and its own
 * Redis index - a dev backend keeps running untouched. Everything else comes from `.env`.
 */
export class TestServer {
    private process: ChildProcess | null = null;
    private output: string[] = [];
    private port = 0;

    constructor(private readonly databaseName: string, private readonly env: Record<string, string>) {}

    get baseUrl(): string {
        return `http://127.0.0.1:${this.port}`;
    }

    async start(): Promise<void> {
        this.port = await freePort();
        this.process = spawn("npx", ["ts-node", "--transpile-only", "src/server.ts"], {
            cwd: BACKEND_ROOT,
            env: {
                ...process.env,
                NODE_ENV: NodeEnv.TEST,
                JWT_EXPIRES_IN: TOKEN_LIFETIME_SECONDS,
                ...this.env,
                PORT: String(this.port),
                DB_NAME: this.databaseName,
                // The tester built the schema already.
                DB_SYNCHRONIZE: "",
            },
            stdio: ["ignore", "pipe", "pipe"],
        });

        // SERVER_LOG=1 streams the backend's own log - where the cause of a 500 is.
        const stream = process.env.SERVER_LOG === "1";
        const capture = (chunk: Buffer) => {
            if (stream) process.stdout.write(chunk.toString());
            this.output.push(chunk.toString());
            if (this.output.length > 200) this.output.shift();
        };
        this.process.stdout?.on("data", capture);
        this.process.stderr?.on("data", capture);
        this.process.once("exit", () => { this.process = null; });

        await this.waitUntilReady();
    }

    async stop(): Promise<void> {
        const child = this.process;
        if (!child) return;
        this.process = null;
        await new Promise<void>((resolve) => {
            child.once("exit", () => resolve());
            child.kill("SIGTERM");
            setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5_000).unref();
        });
    }

    /** The backend's own log, shown when it fails to start. */
    logTail(): string {
        return this.output.join("").split("\n").slice(-LOG_TAIL_LINES).join("\n");
    }

    private async waitUntilReady(): Promise<void> {
        const deadline = Date.now() + READY_TIMEOUT_MS;
        while (Date.now() < deadline) {
            if (!this.process) throw new Error(`backend exited before it was ready\n${this.logTail()}`);
            try {
                const response = await fetch(`${this.baseUrl}${API_PATH}/health`);
                if (response.ok) return;
            } catch {
                // Not listening yet.
            }
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
        throw new Error(`backend did not start within ${READY_TIMEOUT_MS / 1000}s\n${this.logTail()}`);
    }
}
