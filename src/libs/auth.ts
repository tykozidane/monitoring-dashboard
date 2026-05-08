// Third-party Imports
import CredentialProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'
import axios from 'axios'
import * as jsonwebtoken from 'jsonwebtoken'

export const authOptions: NextAuthOptions = {
  // ** Configure one or more authentication providers
  // ** Please refer to https://next-auth.js.org/configuration/options#providers for more `providers` options
  providers: [
    CredentialProvider({
      // ** The name to display on the sign in form (e.g. 'Sign in with...')
      // ** For more details on Credentials Provider, visit https://next-auth.js.org/providers/credentials
      name: 'Credentials',
      type: 'credentials',

      /*
       * As we are using our own Sign-in page, we do not need to change
       * username or password attributes manually in following credentials object.
       */
      credentials: {},
      async authorize(credentials) {
        /*
         * You need to provide your own logic here that takes the credentials submitted and returns either
         * an object representing a user or value that is false/null if the credentials are invalid.
         * For e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
         * You can also use the `req` object to obtain additional parameters (i.e., the request IP address)
         */
        const { username, password, remember } = credentials as { username: string; password: string; remember: string }

        try {
          // ** Login API Call to match the user credentials and receive user data in response along with his role
          const res = await axios({
            method: 'POST',
            url: `${process.env.API_URL}/login`,
            headers: {
              'Content-Type': 'application/json'
            },
            data: { username, password, remember }
          })

          const data = await res.data

          if (data.status === 401) {
            throw new Error(data?.message)
          }

          if (data.status === 200) {
            /*
             * Please unset all the sensitive information of the user either from API response or before returning
             * user data below. Below return statement will set the user object in the token and the same is set in
             * the session which will be accessible all over the app.
             */

            return data.data
          }

          return null
        } catch (e: any) {
          throw new Error(e.message)
        }
      }
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
    })

    // ** ...add more providers here
  ],

  // ** Please refer to https://next-auth.js.org/configuration/options#session for more `session` options
  session: {
    /*
     * Choose how you want to save the user session.
     * The default is `jwt`, an encrypted JWT (JWE) stored in the session cookie.
     * If you use an `adapter` however, NextAuth default it to `database` instead.
     * You can still force a JWT session by explicitly defining `jwt`.
     * When using `database`, the session cookie will only contain a `sessionToken` value,
     * which is used to look up the session in the database.
     * If you use a custom credentials provider, user accounts will not be persisted in a database by NextAuth.js (even if one is configured).
     * The option to use JSON Web Tokens for session tokens must be enabled to use a custom credentials provider.
     */
    strategy: 'jwt',

    // ** Seconds - How long until an idle session expires and is no longer valid
    maxAge: 1 * 24 * 60 * 60 // ** 1 days
  },

  // ** Please refer to https://next-auth.js.org/configuration/options#pages for more `pages` options
  pages: {
    signIn: '/login'
  },

  // ** Please refer to https://next-auth.js.org/configuration/options#callbacks for more `callbacks` options
  callbacks: {
    /*
     * While using `jwt` as a strategy, `jwt()` callback will be called before
     * the `session()` callback. So we have to add custom parameters in `token`
     * via `jwt()` callback to make them accessible in the `session()` callback
     */
    async jwt({ token, user }: any) {
      // 1. Saat pertama kali login
      if (user) {
        token.id = user.id
        token.username = user.username
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.roleId = user.roleId
        token.image = user.image

        // Decode token untuk mendapatkan waktu expired (berupa Unix timestamp)
        const decoded = jsonwebtoken.decode(user.accessToken) as any

        token.accessTokenExpires = (decoded?.exp || 0) * 1000 // Konversi ke milidetik
      }

      // 2. Jika token masih valid (beri jeda aman 1 menit sebelum expired)
      if (Date.now() < token.accessTokenExpires - 60 * 1000) {
        return token
      }

      // 3. Jika token expired dan user punya Refresh Token (karena remember me dicentang)
      if (token.refreshToken) {
        try {
          // Sesuaikan URL ini dengan environment aplikasi Anda
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

          const res = await axios.post(`${baseUrl}/api/auth/refresh`, {
            refreshToken: token.refreshToken
          })

          if (res.data?.status === 200) {
            const newAccessToken = res.data.data.accessToken
            const decodedNewToken = jsonwebtoken.decode(newAccessToken) as any

            // Simpan token baru ke session NextAuth
            token.accessToken = newAccessToken
            token.accessTokenExpires = (decodedNewToken?.exp || 0) * 1000

            return token
          }
        } catch (error) {
          console.error('Gagal refresh token:', error)

          // Jika gagal, set error untuk ditangkap di client
          return { ...token, error: 'RefreshAccessTokenError' }
        }
      }

      // Jika tidak punya refresh token, biarkan token hangus
      return { ...token, error: 'RefreshAccessTokenError' }
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id
        session.user.username = token.username
        session.user.accessToken = token.accessToken
        session.user.refreshToken = token.refreshToken
        session.user.roleId = token.roleId
        session.user.image = token.image

        // Pass pesan error (jika ada) ke client agar bisa ditangkap oleh Axios
        session.error = token.error
      }

      return session
    }
  }
}
