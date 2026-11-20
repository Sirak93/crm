import type { User } from "../models/User";

/** "First Last", or the email when both are empty. */
export const userName = (user: User | undefined): string =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "";
