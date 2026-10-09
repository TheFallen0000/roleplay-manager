/**
 * Application lifecycle port.
 *
 * Allows relaunching the packaged app (for example, after applying an
 * update) without the user having to close and reopen it.
 */
export interface AppRestarter {
  /** Whether this process can restart itself (packaged launcher present). */
  available(): boolean
  /** Relaunches the app and exits the current process. */
  restart(): void
}
