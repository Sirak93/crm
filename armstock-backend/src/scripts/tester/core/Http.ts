import { ErrorCodes } from "armstock-shared";
import { AssertionError } from "./Assert";
import type { IApiResponse } from "../interfaces/IApiResponse";
import type { IFileResponse } from "../interfaces/IFileResponse";
import type { IRequestInfo } from "../interfaces/IRequestInfo";

interface IErrorDef {
    CODE: string;
    STATUS: number;
}

const verbose = process.env.VERBOSE === "1";

// Shared by every client, so a failed case shows its last request whichever user sent it.
let lastRequest: IRequestInfo | null = null;

/** Signs of an internal detail leaking into a client message. */
const LEAK_PATTERNS = [/\n\s+at /, /QueryFailedError/, /SELECT |INSERT |UPDATE |DELETE FROM/i, /node_modules/];

/**
 * Client for the API under test, bound to one token (or none). Never throws on a non-2xx by
 * itself - `ok` and `rejects` are the asserting calls.
 */
export class Http {
    constructor(private readonly baseUrl: string, private readonly token: string | null = null) {}

    static takeLastRequest(): IRequestInfo | undefined {
        return lastRequest ?? undefined;
    }

    static clearLastRequest(): void {
        lastRequest = null;
    }

    withToken(token: string | null): Http {
        return new Http(this.baseUrl, token);
    }

    async send<T = any>(method: string, path: string, body?: unknown): Promise<IApiResponse<T>> {
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (this.token) headers.authorization = `Bearer ${this.token}`;

        const startedAt = Date.now();
        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const durationMs = Date.now() - startedAt;

        const text = await response.text();
        let parsed: any = null;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch {
            parsed = text;
        }

        lastRequest = { method, path, status: response.status, durationMs };
        if (verbose) process.stdout.write(`    → ${method} ${path} ${response.status} ${durationMs}ms\n`);

        return { status: response.status, body: parsed, data: parsed?.data, meta: parsed?.meta };
    }

    /** Asserts a 2xx file download and returns its bytes and name. */
    async download(path: string): Promise<IFileResponse> {
        const headers: Record<string, string> = {};
        if (this.token) headers.authorization = `Bearer ${this.token}`;

        const startedAt = Date.now();
        const response = await fetch(`${this.baseUrl}${path}`, { headers });
        lastRequest = { method: "GET", path, status: response.status, durationMs: Date.now() - startedAt };
        if (response.status >= 400) {
            throw new AssertionError(`GET ${path} failed with ${response.status}`, "a 2xx response", await response.text());
        }

        const encoded = /filename\*=UTF-8''([^;]+)/i.exec(response.headers.get("content-disposition") ?? "")?.[1];
        return {
            contentType: response.headers.get("content-type"),
            fileName: encoded ? decodeURIComponent(encoded) : null,
            content: Buffer.from(await response.arrayBuffer()),
        };
    }

    /** Asserts a 2xx and returns the response - for a step that must succeed. */
    async ok<T = any>(method: string, path: string, body?: unknown): Promise<IApiResponse<T>> {
        const response = await this.send<T>(method, path, body);
        if (response.status >= 400) {
            throw new AssertionError(`${method} ${path} failed with ${response.status}`, "a 2xx response", response.body);
        }
        return response;
    }

    /**
     * Asserts the request is refused with this error (code and status) and that the message
     * shows nothing internal. Returns the response so a case can check `error.meta`.
     */
    async rejects(method: string, path: string, error: IErrorDef, body?: unknown): Promise<IApiResponse> {
        const response = await this.send(method, path, body);

        if (response.status < 400) {
            throw new AssertionError(`${method} ${path} was expected to fail with ${error.CODE}`, error.CODE, response.body);
        }
        const code = response.body?.error?.code;
        if (code !== error.CODE) throw new AssertionError(`${method} ${path} failed with the wrong error code`, error.CODE, response.body);
        if (response.status !== error.STATUS) {
            throw new AssertionError(`${method} ${path} failed with the wrong status`, error.STATUS, response.status);
        }
        const message = String(response.body?.error?.message ?? "");
        if (LEAK_PATTERNS.some((pattern) => pattern.test(message))) {
            throw new AssertionError(`${method} ${path} error message shows internal details`, "a client-safe message", message);
        }
        return response;
    }

    /** Asserts a validation refusal that names `field` among its issues. */
    async rejectsField(method: string, path: string, field: string, body?: unknown): Promise<IApiResponse> {
        const response = await this.rejects(method, path, ErrorCodes.VALIDATION.GLOBAL, body);
        const issues: { path: (string | number)[] }[] = response.body?.error?.meta?.validation ?? [];
        if (!issues.some((issue) => issue.path.join(".") === field)) {
            throw new AssertionError(`${method} ${path} did not name the field "${field}"`, field, issues.map((i) => i.path.join(".")));
        }
        return response;
    }
}
