/**
 * Puerto de ciclo de vida de la aplicación.
 *
 * Permite relanzar la app empaquetada (por ejemplo, después de aplicar una
 * actualización) sin que el usuario tenga que cerrar y volver a abrir.
 */
export interface AppRestarter {
  /** Whether this process can restart itself (packaged launcher present). */
  available(): boolean
  /** Relaunches the app and exits the current process. */
  restart(): void
}
