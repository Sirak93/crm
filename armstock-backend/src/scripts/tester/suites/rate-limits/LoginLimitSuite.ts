import { ErrorCodes } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { RateLimits } from "../../../../constants/RateLimits";
import { PATHS } from "../../shared/Paths";
import { randomPassword } from "../../shared/Random";
import type { ITestContext } from "../../interfaces/ITestContext";

/** The Platform Owner's login is the only account this side has - its email is the real one, the password wrong. */
export default (context: ITestContext) => defineSuite("Login rate limit", (test) => {
    const { anonymous, platformOwner } = context;
    const { max } = RateLimits.LOGIN;
    // The runner's own Platform Owner login was the first one in this window.
    const left = max - 1;

    test(`up to ${max} logins, wrong ones get the normal answer`, async () => {
        for (let attempt = 1; attempt <= left; attempt++) {
            await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.AUTH.INVALID_CREDENTIALS,
                { email: platformOwner.email, password: randomPassword() });
        }
    });

    test("the next one is refused for too many attempts - even with the right password", async () => {
        await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.RATE_LIMIT.TOO_MANY_REQUESTS,
            { email: platformOwner.email, password: randomPassword() });
        await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.RATE_LIMIT.TOO_MANY_REQUESTS,
            { email: platformOwner.email, password: platformOwner.password });
    });

    test("other routes are not limited by it", async () => {
        await platformOwner.api.ok("GET", PATHS.AUTH_USER);
    });
});
