import { UserRole, type IAuthUser } from 'armstock-shared';

interface IUserModelData {
  uuid: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  firstName: string | null;
  lastName: string | null;
  lastLoginAt: Date | null;
}

export class UserModel {
  uuid: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  firstName: string | null;
  lastName: string | null;
  lastLoginAt: Date | null;

  constructor(data: IUserModelData) {
    this.uuid = data.uuid;
    this.email = data.email;
    this.role = data.role;
    this.isActive = data.isActive;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.lastLoginAt = data.lastLoginAt;
  }

  static fromJSON(json: IAuthUser): UserModel {
    return new UserModel({
      uuid: json.uuid,
      email: json.email,
      role: json.role,
      isActive: json.isActive,
      // Names come from the staff record, which the API does not send yet.
      firstName: null,
      lastName: null,
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

  get isPlatformOwner(): boolean {
    return this.role === UserRole.PLATFORM_OWNER;
  }
}
