export interface ITestCase {
    name: string;
    /** Returning without throwing means the case passed. */
    fn: () => Promise<void> | void;
    skip?: boolean;
}
