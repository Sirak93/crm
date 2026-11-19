import { CATALOG_MANAGER_ROLES, STOCK_MANAGER_ROLES, UserRole, UserStatus, type IAuthUser } from 'armstock-shared';

interface IUserModelData {
  uuid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  lastLoginAt: Date | null;
}

export class UserModel {
  uuid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  lastLoginAt: Date | null;

  constructor(data: IUserModelData) {
    this.uuid = data.uuid;
    this.email = data.email;
    this.role = data.role;
    this.status = data.status;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.lastLoginAt = data.lastLoginAt;
  }

  static fromJSON(json: IAuthUser): UserModel {
    return new UserModel({
      uuid: json.uuid,
      email: json.email,
      role: json.role,
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

  /** Units, categories, products: Company Owner and Storekeeper manage, Accountant only views. */
  get canManageCatalog(): boolean {
    return CATALOG_MANAGER_ROLES.includes(this.role);
  }

  /** Stock documents: Company Owner and Storekeeper create, Accountant only views. */
  get canManageStock(): boolean {
    return STOCK_MANAGER_ROLES.includes(this.role);
  }

  get isPlatformOwner(): boolean {
    return this.role === UserRole.PLATFORM_OWNER;
  }
}
