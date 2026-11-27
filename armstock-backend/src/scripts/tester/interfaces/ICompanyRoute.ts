import type { Permission } from "armstock-shared";
import type { HttpMethod } from "../enums/HttpMethod";
import type { RouteTarget } from "../enums/RouteTarget";
import type { IOwnRefs } from "./IOwnRefs";
import type { IRouteIds } from "./IRouteIds";

/** One company route, as the access suites loop over it. */
export interface ICompanyRoute {
    method: HttpMethod;
    path: (ids: IRouteIds) => string;
    /** Null for routes every company member may call. */
    permission: Permission | null;
    /** Set on routes with a `:uuid` - what it points at. */
    target?: RouteTarget;
    /** A valid body, so a call gets past validation and reaches the record lookup. */
    body?: (refs: IOwnRefs) => unknown;
    /** An Excel file, not JSON - left out of the "lists never show company B" check. */
    download?: true;
}
