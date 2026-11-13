// DOMINIO: tipos y reglas del negocio.
// No importa React, SQLite ni axios: se puede probar sin celular, sin base y sin red.

/** Una charla tal como la publica la organización. */
export type Ficha = {id: string; title: string; track: string; day: number; time: string;
  room: string; speaker: string; summary: string};

/** Una charla dentro de la app: la ficha más la marca del usuario. */
export type Charla = Ficha & {favorita: boolean};

export const SECCIONES = ['Programa', 'Mi agenda', 'Mesa'] as const;
export type Seccion = (typeof SECCIONES)[number];

/** El índice es el número de día. 0 significa "sin filtro de día". */
export const DIAS = ['Ambos días', 'Día 1', 'Día 2'] as const;

export const TEMA_TODOS = 'Todos';
export const TEMAS = [TEMA_TODOS, 'Android', 'Datos', 'Calidad'] as const;

/** Dónde quedó leyendo el usuario: pestaña, ficha abierta y los dos filtros. */
export type PuntoDeLectura = {seccion: Seccion; fichaId: string | null; dia: number; tema: string};

/** Una tarea nueva arranca así: en Programa, sin ficha abierta y sin filtros. */
export const LECTURA_INICIAL: PuntoDeLectura = {
  seccion: 'Programa', fichaId: null, dia: 0, tema: TEMA_TODOS,
};

/**
 * Contrato: lo que el ViewModel le puede pedir a la capa de datos.
 * El ViewModel depende de esta lista de pedidos y no de SQLite ni de axios,
 * por eso se lo puede probar con un Repository de mentira.
 */
export type RepositorioAgenda = {
  listar(): Promise<Charla[]>;
  hayEdicionGuardada(): Promise<boolean>;
  sincronizar(): Promise<void>;
  marcar(id: string, favorita: boolean): Promise<void>;
  leerLectura(tarea: string): Promise<PuntoDeLectura | null>;
  guardarLectura(tarea: string, lectura: PuntoDeLectura): Promise<void>;
  arrancarSinServicio(): Promise<void>;
};

/** Busca la charla de la ficha abierta. Si se retiró del programa, devuelve undefined. */
export function buscarCharla(charlas: Charla[], id: string | null): Charla | undefined {
  return id === null ? undefined : charlas.find(c => c.id === id);
}

/** Única regla de filtrado del catálogo (día + tema). */
export function filtrarCharlas(charlas: Charla[], dia: number, tema: string): Charla[] {
  return charlas.filter(c => (dia === 0 || c.day === dia) && (tema === TEMA_TODOS || c.track === tema));
}

/** Única regla de "Mi agenda": las charlas marcadas. */
export function soloFavoritas(charlas: Charla[]): Charla[] {
  return charlas.filter(c => c.favorita);
}

/** Valida un punto de lectura leído del disco. Si algo no cierra, devuelve null. */
export function leerPuntoDeLectura(dato: unknown): PuntoDeLectura | null {
  if (typeof dato !== 'object' || dato === null) { return null; }
  const d = dato as Record<string, unknown>;
  const seccion = SECCIONES.find(s => s === d.seccion);
  const diaValido = typeof d.dia === 'number' && d.dia >= 0 && d.dia < DIAS.length;
  const tema = TEMAS.find(t => t === d.tema);
  const fichaValida = d.fichaId === null || typeof d.fichaId === 'string';
  if (!seccion || !diaValido || !tema || !fichaValida) { return null; }
  return {seccion, fichaId: d.fichaId as string | null, dia: d.dia as number, tema};
}
