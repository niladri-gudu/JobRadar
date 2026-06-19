import { auth } from '../../lib/auth';

export class AuthService {
  async signUp(body: any) {
    return auth.api.signUpEmail({
      body,
      asResponse: true,
    });
  }

  async signIn(body: any) {
    return auth.api.signInEmail({
      body,
      asResponse: true,
    });
  }
}
