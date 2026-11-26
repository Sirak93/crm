import { DefaultRole } from "armstock-shared";

/** Names of the roles copied into every new company. */
export const DEFAULT_ROLE_NAMES: Readonly<Record<DefaultRole, string>> = {
    [DefaultRole.STOREKEEPER]: "Պահեստապետ",
    [DefaultRole.ACCOUNTANT]: "Հաշվապահ",
    [DefaultRole.STAFF]: "Աշխատակից",
    [DefaultRole.CHEF]: "Շեֆ-խոհարար",
};
