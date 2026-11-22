import type { DefaultRole } from "armstock-shared";
import type { ITestUser } from "./ITestUser";

/** A company made through the platform API, with one user per default role. */
export interface ITestCompany {
    uuid: string;
    name: string;
    owner: ITestUser;
    storekeeper: ITestUser;
    accountant: ITestUser;
    hr: ITestUser;
    /** Staff role - no permissions at all. */
    staff: ITestUser;
    /** Role uuid per default role. */
    roles: Record<DefaultRole, string>;
}
