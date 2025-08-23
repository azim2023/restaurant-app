import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import bcrypt from 'bcrypt';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: {label: "Email", type: "email"},
                password: {label: "Password", type: "Password"}
        },
        async authorize(credentials) {
            if(!credentials?.email || !credentials.password) return null;

            const userRes= await db.query(
                `SELECT * FROM users WHERE email = $1 AND archived_at IS NULL`,
                [credentials.email]
            );

            const user = userRes.rows[0];
            if (!user) return null;
            const passwordsMatch = await bcrypt.compare(credentials.password, user.password_hash);
            if (passwordsMatch) {
                return {
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role,
                };
            }
            return null;
        }
    })
    ],
    session: {
        strategy:  "jwt",
    },
    callbacks: {
        async jwt({token, user}){
            if(user) {
                token.id = user.id;
                token.role = (user as any).role;
            }
            return token;
        },
        // session: ({ session, token }) => ({
        //     ...session,
        //     user: { 
        //         ...session.user,
        //         id: token.id as string,
        //     },
        // }),
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login"
    }
};