import NextAuth, { type NextAuthOptions, type User as NextAuthDefaultUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByEmail } from '@/lib/db';
import { compare } from 'bcrypt';
import type { User as CustomUser, UserRole } from '@/types/user'; // Assuming UserRole is in user.ts

// Augment NextAuth types to include 'role' and 'id' on user and token
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & NextAuthDefaultUser; // NextAuthUser is the default user type from next-auth
  }

  interface User extends CustomUser { // CustomUser should have id, name, email, role
    id: string; // Ensure id is always a string for NextAuth
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        // Define credentials if you were to use a NextAuth-driven form
        // For now, this is mostly for type completeness as Firebase handles actual login UI
        // email: { label: "Email", type: "text", placeholder: "jsmith@example.com" },
        // password: { label: "Password", type: "password" }
      },
      async authorize(credentials: Record<string, string> | undefined) {
        // This provider is kept for compatibility or if NextAuth's flow is triggered.
        // The main login flow uses Firebase via AuthContext.
        if (!credentials?.email || !credentials?.password) {
          console.warn('[NextAuth][Authorize] Missing email or password.');
          return null;
        }

        const { email, password } = credentials;

        try {
          console.log(`[NextAuth][Authorize] Attempting login for: ${email}`);
          const userFromDb = await findUserByEmail(email);

          if (!userFromDb) {
            console.log(`[NextAuth][Authorize] User not found: ${email}`);
            return null;
          }

          // Ensure userFromDb.password is a string
          if (typeof userFromDb.password !== 'string') {
             console.error(`[NextAuth][Authorize] User password is not a string for email: ${email}`);
             return null;
          }

          const passwordMatch = await compare(password, userFromDb.password);

          if (passwordMatch) {
            console.log(`[NextAuth][Authorize] Credentials valid for: ${email}`);
            // Ensure the returned user object matches NextAuth's expected User type + custom fields
            return {
              id: String(userFromDb.id), // Ensure id is a string
              name: userFromDb.name || userFromDb.email, // Provide a name
              email: userFromDb.email,
              role: userFromDb.role as UserRole, // Cast role if necessary
            };
          } else {
            console.log(`[NextAuth][Authorize] Invalid credentials for: ${email}`);
            return null;
          }
        } catch (error) {
          console.error('[NextAuth][Authorize] Error during authorization:', error);
          // Return null to indicate authorization failure, preventing API route crash
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Persist user.id and user.role to the token
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass id and role to the session from the token
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Redirect to custom login page
  },
  secret: process.env.NEXTAUTH_SECRET, // Essential for JWT
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
