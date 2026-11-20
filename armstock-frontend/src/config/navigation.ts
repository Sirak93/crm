import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Building,
  Building2,
  Database,
  LayoutDashboard,
  Package,
  Ruler,
  Scale,
  ScrollText,
  ShieldCheck,
  Tags,
  Truck,
  Users,
} from 'lucide-vue-next';
import { ROUTE_NAME } from '../constants/constants';
import type { INavGroup } from '../interfaces/INavGroup';
import type { INavItem } from '../interfaces/INavItem';

/** Sidebar menu; each user sees only the items whose page they may open (the route's meta decides). */
export const NAV_ITEMS: (INavItem | INavGroup)[] = [
  {
    id: 'platform-dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    routeName: ROUTE_NAME.PLATFORM_DASHBOARD,
  },
  {
    id: 'platform-companies',
    labelKey: 'nav.companies',
    icon: Building2,
    routeName: ROUTE_NAME.PLATFORM_COMPANIES,
  },
  {
    id: 'platform-database',
    labelKey: 'nav.database',
    icon: Database,
    routeName: ROUTE_NAME.PLATFORM_DATABASE,
  },
  {
    id: 'platform-logs',
    labelKey: 'nav.logs',
    icon: ScrollText,
    routeName: ROUTE_NAME.PLATFORM_LOGS,
  },
  {
    id: 'company-dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    routeName: ROUTE_NAME.COMPANY_DASHBOARD,
  },
  {
    id: 'company-stock',
    labelKey: 'nav.stock',
    icon: Boxes,
    children: [
      {
        id: 'company-stock-in',
        labelKey: 'nav.stockIn',
        icon: ArrowDownToLine,
        routeName: ROUTE_NAME.COMPANY_STOCK_INS,
      },
      {
        id: 'company-stock-out',
        labelKey: 'nav.stockOut',
        icon: ArrowUpFromLine,
        routeName: ROUTE_NAME.COMPANY_STOCK_OUTS,
      },
      {
        id: 'company-stock-balance',
        labelKey: 'nav.stockBalance',
        icon: Scale,
        routeName: ROUTE_NAME.COMPANY_STOCK_BALANCE,
      },
    ],
  },
  {
    id: 'company-products',
    labelKey: 'nav.products',
    icon: Package,
    routeName: ROUTE_NAME.COMPANY_PRODUCTS,
  },
  {
    id: 'company-suppliers',
    labelKey: 'nav.suppliers',
    icon: Truck,
    routeName: ROUTE_NAME.COMPANY_SUPPLIERS,
  },
  {
    id: 'company-measure-units',
    labelKey: 'nav.measureUnits',
    icon: Ruler,
    routeName: ROUTE_NAME.COMPANY_MEASURE_UNITS,
  },
  {
    id: 'company-product-categories',
    labelKey: 'nav.productCategories',
    icon: Tags,
    routeName: ROUTE_NAME.COMPANY_PRODUCT_CATEGORIES,
  },
  {
    id: 'company-users',
    labelKey: 'nav.users',
    icon: Users,
    routeName: ROUTE_NAME.COMPANY_USERS,
  },
  {
    id: 'company-roles',
    labelKey: 'nav.roles',
    icon: ShieldCheck,
    routeName: ROUTE_NAME.COMPANY_ROLES,
  },
  {
    id: 'company-profile',
    labelKey: 'nav.company',
    icon: Building,
    routeName: ROUTE_NAME.COMPANY_PROFILE,
  },
];

export const isNavGroup = (entry: INavItem | INavGroup): entry is INavGroup => 'children' in entry;
