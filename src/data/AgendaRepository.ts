// REPOSITORY: el único que habla con la base (archivo.ts) y con el servicio (lab/servicio.ts).
// El ViewModel le pide cosas por nombre y no sabe si vienen de SQLite o de la red.
import {api} from '../lab/servicio';
import {leerPuntoDeLectura} from '../domain/agenda';
import type {Ficha, PuntoDeLectura, RepositorioAgenda} from '../domain/agenda';
import {ajuste, configurar, hayEdicionGuardada, listar, marcar, reemplazarPrograma} from './archivo';

const CLAVE_LECTURA = 'lectura';

/** Revisa lo que mandó el servicio antes de guardarlo. Una lista vacía es una edición válida. */
function validarPrograma(dato: unknown): Ficha[] {
  if (!Array.isArray(dato)) { throw new Error('El servicio no devolvió un programa'); }
  return dato.map(f => {
    if (typeof f !== 'object' || f === null || typeof f.id !== 'string' || f.id === '') {
      throw new Error('El programa trae una charla sin identificador');
    }
    return {id: f.id, title: String(f.title ?? ''), track: String(f.track ?? ''), day: Number(f.day),
      time: String(f.time ?? ''), room: String(f.room ?? ''), speaker: String(f.speaker ?? ''),
      summary: String(f.summary ?? '')};
  });
}

export const agendaRepository: RepositorioAgenda = {
  listar,
  marcar,
  hayEdicionGuardada,

  /** Pide la instantánea al servicio y recién si llegó bien reemplaza lo guardado. */
  async sincronizar() {
    const respuesta = await api.get<unknown>('/programa');
    await reemplazarPrograma(validarPrograma(respuesta.data));
  },

  /** Devuelve el punto de lectura solo si lo guardó esta misma tarea de Android. */
  async leerLectura(tarea) {
    try {
      const guardado = JSON.parse(await ajuste(CLAVE_LECTURA, 'null'));
      return guardado && guardado.tarea === tarea ? leerPuntoDeLectura(guardado.lectura) : null;
    } catch {
      return null; // si lo guardado no se entiende, se arranca de cero
    }
  },
  async guardarLectura(tarea: string, lectura: PuntoDeLectura) {
    await configurar(CLAVE_LECTURA, JSON.stringify({tarea, lectura}));
  },

  /** Arranque de prueba "sin señal": apaga el servicio del laboratorio antes de la primera consulta. */
  async arrancarSinServicio() {
    await configurar('disponible', 'no');
  },
};
