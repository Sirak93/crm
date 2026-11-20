import { DefaultRole } from "armstock-shared";

/** Names of the roles copied into every new company. */
export const DEFAULT_ROLE_NAMES: Readonly<Record<DefaultRole, string>> = {
    [DefaultRole.STOREKEEPER]: "Storekeeper",
    [DefaultRole.ACCOUNTANT]: "Accountant",
    [DefaultRole.HR]: "HR",
};
