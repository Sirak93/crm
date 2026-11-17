import fs from "fs/promises";

/** Non-blocking file helpers. */
export class FileWorker {
    static async ensureDirectory(dirPath: string): Promise<void> {
        await fs.mkdir(dirPath, { recursive: true });
    }

    static async append(filePath: string, data: string): Promise<void> {
        await fs.appendFile(filePath, data + "\n", "utf8");
    }
}
