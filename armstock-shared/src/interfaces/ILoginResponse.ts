import type { IAuthUser } from "./IAuthUser";

export interface ILoginResponse {
    user: IAuthUser;
    token: string;
    refreshToken: string;
}
