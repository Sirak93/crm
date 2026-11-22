export enum StockOutReason {
    /** Sent back to a supplier - supplier required. */
    RETURNED = 10,
    /** Given to a department - department required, receiver optional. */
    ISSUED = 20,
    DAMAGED = 30,
    EXPIRED = 40,
    /** Anything else - note required. */
    OTHER = 60,
}
