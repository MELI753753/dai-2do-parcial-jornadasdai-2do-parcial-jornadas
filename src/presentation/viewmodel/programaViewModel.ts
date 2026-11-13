// VIEWMODEL: guarda el estado de la pantalla y decide. No dibuja y no toca SQLite ni la red:
// todo lo pide al Repository que recibe por parámetro (así se puede probar con uno de mentira).
// No importa React: el estado vive fuera de los componentes, por eso sobrevive cuando una
// pantalla se desmonta (rotar, entrar a una ficha, cambiar de pestaña).
import {LECTURA_INICIAL} from '../../domain/agenda';
import type {Charla, PuntoDeLectura, RepositorioAgenda, Seccion} from '../../domain/agenda';

/** Un solo cartel a la vez sobre la última consulta al servicio. */
export type Carga = 'cargando' | 'listo' | 'error';

export type EstadoPrograma = PuntoDeLectura & {
  abierta: boolean;     // ya se leyó lo guardado en el teléfono y se puede dibujar
  charlas: Charla[];
  carga: Carga;
  hayEdicion: boolean;  // alguna vez se descargó una edición (puede tener cero charlas)
  aviso: string;        // mensaje para el usuario sobre la última consulta
  avisoMarca: string;   // mensaje si no se pudo guardar una marca
};

export const AVISO_DATOS_GUARDADOS = 'Sin señal: se están usando datos guardados.';
export const AVISO_SIN_DESCARGA = 'No se pudo consultar el programa.';

export function crearProgramaViewModel(repo: RepositorioAgenda) {
  let estado: EstadoPrograma = {
    ...LECTURA_INICIAL, abierta: false, charlas: [], carga: 'listo', hayEdicion: false, aviso: '', avisoMarca: '',
  };
  const observadores = new Set<() => void>();

  // Variables comunes (no estado): se leen y cambian en el acto, sin esperar un redibujo.
  let tarea: string | null = null;      // tarea de Android dueña del punto de lectura
  let cargaAutomaticaHecha = false;     // pedido 44: una sola carga automática por proceso
  let peticionEnCurso = false;          // pedido 44: candado contra el doble toque
  let turnoDeLectura = 0;               // descarta listados viejos que lleguen tarde

  function publicar(cambios: Partial<EstadoPrograma>) {
    estado = {...estado, ...cambios};
    observadores.forEach(fn => fn());
  }
  function suscribir(fn: () => void) {
    observadores.add(fn);
    return () => { observadores.delete(fn); };
  }

  /** Trae del teléfono la lista y si hay edición. Solo publica si nadie pidió otra lectura después. */
  async function leerGuardado() {
    const turno = ++turnoDeLectura;
    const [charlas, hayEdicion] = await Promise.all([repo.listar(), repo.hayEdicionGuardada()]);
    if (turno === turnoDeLectura) { publicar({charlas, hayEdicion}); }
  }

  /**
   * Arranque. `tareaNueva` identifica la tarea de Android: es la misma si Android recupera
   * la tarea después de matar el proceso, y es otra si el usuario abre una tarea nueva.
   */
  async function iniciar(tareaNueva: string, sinServicio: boolean) {
    try {
      if (sinServicio) { await repo.arrancarSinServicio(); }
      if (tareaNueva !== tarea) {
        tarea = tareaNueva;
        publicar({abierta: false});
        // Pedido 43: misma tarea = vuelve la ficha y los filtros. Tarea nueva = sin filtros.
        const guardada = await repo.leerLectura(tareaNueva);
        publicar(guardada ?? LECTURA_INICIAL);
        if (!guardada) { persistirLectura(); }
      }
      await leerGuardado(); // lo guardado se ve enseguida, con o sin señal
    } catch {
      publicar({carga: 'error', aviso: 'No se pudo abrir la agenda guardada.'});
    } finally {
      publicar({abierta: true});
    }
    if (!cargaAutomaticaHecha) {
      cargaAutomaticaHecha = true; // no depende de que se monte o desmonte una pantalla
      void actualizar();
    }
  }

  /** Consulta el servicio. La usan la carga automática y los botones Actualizar y Reintentar. */
  async function actualizar() {
    if (peticionEnCurso) { return; } // dos toques durante una petición = un solo intento
    peticionEnCurso = true;
    publicar({carga: 'cargando', aviso: ''});
    try {
      await repo.sincronizar();
      await leerGuardado();
      publicar({carga: 'listo'});
    } catch {
      // Pedido 41: no se borra nada. Si hay una edición guardada se sigue mostrando.
      publicar({carga: 'error', aviso: estado.hayEdicion ? AVISO_DATOS_GUARDADOS : AVISO_SIN_DESCARGA});
    } finally {
      peticionEnCurso = false; // tras éxito o falla se puede volver a pedir
    }
  }

  /** Agrega o quita la charla de Mi agenda. Guarda primero y después vuelve a leer la base. */
  async function alternarFavorita(id: string) {
    const charla = estado.charlas.find(c => c.id === id);
    if (!charla) { return; }
    try {
      await repo.marcar(id, !charla.favorita);
      await leerGuardado();
      publicar({avisoMarca: ''});
    } catch {
      publicar({avisoMarca: 'No se pudo guardar el cambio en tu agenda.'});
    }
  }

  // --- Punto de lectura (pedido 43): cada cambio se publica y se guarda en el teléfono ---
  function persistirLectura() {
    if (tarea === null) { return; }
    const {seccion, fichaId, dia, tema} = estado;
    // Si falla el guardado no se molesta al usuario: solo se pierde el "volver donde estaba".
    repo.guardarLectura(tarea, {seccion, fichaId, dia, tema}).catch(() => {});
  }
  function moverLectura(cambios: Partial<PuntoDeLectura>) {
    publicar(cambios);
    persistirLectura();
  }
  const elegirSeccion = (seccion: Seccion) => moverLectura({seccion});
  const elegirDia = (dia: number) => moverLectura({dia});
  const elegirTema = (tema: string) => moverLectura({tema});
  const abrirFicha = (fichaId: string) => moverLectura({fichaId});
  function cerrarFicha() {
    publicar({avisoMarca: ''});
    moverLectura({fichaId: null});
  }

  /** Botón Atrás de Android. Devuelve false cuando ya no hay adónde volver (sale de la app). */
  function retroceder(): boolean {
    if (estado.fichaId !== null) { cerrarFicha(); return true; }
    if (estado.seccion !== 'Programa') { elegirSeccion('Programa'); return true; }
    return false;
  }

  return {
    obtener: () => estado, suscribir,
    iniciar, actualizar, alternarFavorita,
    elegirSeccion, elegirDia, elegirTema, abrirFicha, cerrarFicha, retroceder,
  };
}
