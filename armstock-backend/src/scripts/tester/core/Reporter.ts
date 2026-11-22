import { CaseStatus } from "../enums/CaseStatus";
import type { ICaseResult } from "../interfaces/ICaseResult";

const C = {
    reset: "\x1b[0m", bold: "\x1b[1m",
    green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m", grey: "\x1b[90m",
};

const MARKS: Record<CaseStatus, string> = {
    [CaseStatus.PASSED]: `${C.green}✓${C.reset}`,
    [CaseStatus.FAILED]: `${C.red}✗${C.reset}`,
    [CaseStatus.SKIPPED]: `${C.yellow}-${C.reset}`,
};

const INLINE_MAX = 400;

const ms = (value: number) => (value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`);
const print = (line = "") => process.stdout.write(`${line}\n`);

interface ITotals {
    passed: number;
    failed: number;
    skipped: number;
}

/** Terminal output only: each case as it finishes, each failure with its reason, totals at the end. */
export class Reporter {
    private readonly startedAt = Date.now();
    private readonly totals: ITotals = { passed: 0, failed: 0, skipped: 0 };
    private readonly failures: string[] = [];
    private side = "";
    private suite = "";

    constructor() {
        print();
        print(`${C.bold}${C.cyan}Armstock backend tester${C.reset}`);
    }

    startSide(name: string): void {
        this.side = name;
        print();
        print(`${C.bold}${C.cyan}${name.toUpperCase()} SIDE${C.reset}`);
    }

    startSuite(name: string): void {
        this.suite = name;
        print();
        print(`${C.bold}${name}${C.reset}`);
    }

    finishCase(result: ICaseResult): void {
        if (result.status === CaseStatus.PASSED) this.totals.passed += 1;
        if (result.status === CaseStatus.SKIPPED) this.totals.skipped += 1;
        if (result.status === CaseStatus.FAILED) {
            this.totals.failed += 1;
            this.failures.push(`${this.side} › ${this.suite} › ${result.name}`);
        }

        print(`  ${MARKS[result.status]} ${result.name} ${C.grey}${ms(result.durationMs)}${C.reset}`);
        if (result.status !== CaseStatus.FAILED || !result.error) return;

        print(`      ${C.red}${result.error.message}${C.reset}`);
        if (result.error.expected !== undefined || result.error.actual !== undefined) {
            print(`      ${C.green}expected:${C.reset} ${inline(result.error.expected)}`);
            print(`      ${C.red}actual:  ${C.reset} ${inline(result.error.actual)}`);
        }
        if (result.request) {
            print(`      ${C.grey}${result.request.method} ${result.request.path} → ${result.request.status}${C.reset}`);
        }
    }

    /** Prints the totals and returns whether everything passed. */
    finish(): boolean {
        const { passed, failed, skipped } = this.totals;
        const ok = failed === 0;
        print();
        print(
            `${ok ? `${C.green}${C.bold}PASSED` : `${C.red}${C.bold}FAILED`}${C.reset}  ` +
            `${passed} passed, ${failed} failed, ${skipped} skipped ${C.grey}(${ms(Date.now() - this.startedAt)})${C.reset}`,
        );
        if (!ok) {
            print();
            for (const failure of this.failures) print(`  ${C.red}✗${C.reset} ${failure}`);
        }
        print();
        return ok;
    }
}

const inline = (value: unknown): string => {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (text === undefined) return "undefined";
    return text.length > INLINE_MAX ? `${text.slice(0, INLINE_MAX)}…` : text;
};
