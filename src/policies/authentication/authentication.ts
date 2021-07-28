export interface AuthenticationState {
  username?: string
  token?: string
}

declare module "../../policy" {
  namespace Policy {
    interface State<T, P> extends AuthenticationState {
      this?: State<T, P>
    }
  }
}
