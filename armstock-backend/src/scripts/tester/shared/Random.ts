import * as crypto from "crypto";

const EMAIL_DOMAIN = "armstock-tester.invalid";

/** Random per run and never printed; the accounts live only in the scratch database. */
export const randomPassword = (): string => `T${crypto.randomBytes(15).toString("base64url")}!7`;

/** A name no other case in the run uses - keeps unique-name rules out of the way. */
export const uniqueName = (prefix: string): string => `${prefix} ${crypto.randomBytes(4).toString("hex")}`;

export const uniqueEmail = (prefix: string): string => `${prefix}-${crypto.randomBytes(4).toString("hex")}@${EMAIL_DOMAIN}`;

/** A uuid that exists nowhere - for "unknown uuid" cases. */
export const randomUuid = (): string => crypto.randomUUID();
