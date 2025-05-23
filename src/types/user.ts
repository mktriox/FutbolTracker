export enum UserRole {
  ADMIN = 'ADMIN',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  SECRETARY = 'SECRETARY',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Note: Storing passwords directly like this is not secure in a real application.
}
