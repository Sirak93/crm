import { AccountType, can, type IAuthUser, type Permission, type UserStatus } from 'armstock-shared';

interface IUserModelData {
  uuid: string;
  email: string;
  accountType: AccountType;
  permissions: ReadonlySet<Permission>;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  lastLoginAt: Date | null;
}

export class UserModel {
  uuid: string;
  email: string;
  accountType: AccountType;
  /** A Set once here, so the many checks are direct lookups. */
  permissions: ReadonlySet<Permission>;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  lastLoginAt: Date | null;

  constructor(data: IUserModelData) {
    this.uuid = data.uuid;
    this.email = data.email;
    this.accountType = data.accountType;
    this.permissions = data.permissions;
    this.status = data.status;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.lastLoginAt = data.lastLoginAt;
  }

  static fromJSON(json: IAuthUser): UserModel {
    return new UserModel({
      uuid: json.uuid,
      email: json.email,
      accountType: json.accountType,
      permissions: new Set(json.permissions),
      status: json.status,
      firstName: json.firstName,
      lastName: json.lastName,
      lastLoginAt: json.lastLoginAt ? new Date(json.lastLoginAt) : null,
    });
  }

  get fullName(): string | null {
    const name = [this.firstName, this.lastName].filter(Boolean).join(' ');
    return name || null;
  }

  get displayName(): string {
    return this.fullName ?? this.email;
  }

  get initials(): string {
    if (this.firstName || this.lastName) {
      return `${this.firstName?.[0] ?? ''}${this.lastName?.[0] ?? ''}`.toUpperCase();
    }
    return this.email.charAt(0).toUpperCase();
  }

  /** The Company Owner has every permission. */
  can(permission: Permission): boolean {
    return can(this.accountType, this.permissions, permission);
  }

  /** True with at least one of them - e.g. a page shown for any of its actions. */
  canAny(permissions: readonly Permission[]): boolean {
    return permissions.some((permission) => this.can(permission));
  }

  get isPlatformOwner(): boolean {
    return this.accountType === AccountType.PLATFORM_OWNER;
  }

  get isCompanyOwner(): boolean {
    return this.accountType === AccountType.COMPANY_OWNER;
  }
}
