// Conecta el ViewModel con React y con el Repository real.
import {useSyncExternalStore} from 'react';
import {agendaRepository} from '../../data/AgendaRepository';
import {crearProgramaViewModel} from './programaViewModel';

/** Una sola instancia para toda la app: todas las pantallas miran el mismo estado. */
export const programa = crearProgramaViewModel(agendaRepository);

/** Hook: la pantalla que lo usa se redibuja sola cada vez que el ViewModel publica un cambio. */
export function usePrograma() {
  return useSyncExternalStore(programa.suscribir, programa.obtener);
}
