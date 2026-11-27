/** A download (an Excel file) - the body as bytes, not JSON. */
export interface IFileResponse {
    contentType: string | null;
    /** From `filename*` in Content-Disposition. */
    fileName: string | null;
    content: Buffer;
}
