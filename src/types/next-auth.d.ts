import type { User as DefaultUser, Session as DefaultSession } from 'next-auth';
import type { JWT as DefaultJWT } from 'next-auth/jwt';
import type { UserRole } from './user'; // Adjust path if your UserRole enum is elsewhere

declare module 'next-auth' {
  interface User extends DefaultUser {
    id: string; // Ensure id is always string
    role: UserRole;
    // Add any other custom properties you expect on the user object
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      // Ensure these match what you put in the session callback
    } & DefaultSession['user']; // Keep existing properties like name, email, image
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    // Add any other properties you are adding to the token in the jwt callback
  }
}
