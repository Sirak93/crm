import type { UserStatus } from "../enums/UserStatus";

/** A company user offered as a stock-out receiver. */
export interface IStockOutReceiver {
    uuid: string;
    name: string;
    position: string | null;
    status: UserStatus;
}
