// DATOS (SQLite): lo único que este archivo sabe hacer es guardar y traer.
// No decide nada y no conoce pantallas. Solo lo usa el Repository (y el laboratorio para sus ajustes).
import SQLite from 'react-native-sqlite-storage';
import type {Charla, Ficha} from '../domain/agenda';

// El laboratorio (src/lab/servicio.ts) toma el tipo Ficha de este archivo.
export type {Ficha} from '../domain/agenda';

SQLite.enablePromise(true);
// Misma base y mismas tablas que la versión ya instalada: al actualizar la app
// los usuarios conservan sus charlas y sus marcas (no hay DROP ni cambio de esquema).
const db = SQLite.openDatabase({name: 'cartelera.db', location: 'default'}).then(async archivo => {
  await archivo.executeSql(`CREATE TABLE IF NOT EXISTS charlas (
    id TEXT PRIMARY KEY, title TEXT, track TEXT, day INTEGER, time TEXT,
    room TEXT, speaker TEXT, summary TEXT, favorita INTEGER DEFAULT 0)`);
  await archivo.executeSql('CREATE TABLE IF NOT EXISTS ajustes (nombre TEXT PRIMARY KEY, valor TEXT)');
  return archivo;
});

/** Así guarda SQLite una charla: la marca es un 0 o un 1. Ese detalle no sale de este archivo. */
type FilaCharla = Ficha & {favorita: number};

/** Constancia de que alguna vez se descargó una edición (aunque haya venido con cero charlas). */
const CLAVE_EDICION = 'edicion_descargada';

// En modo promesa, la librería deja seguir la transacción aunque una orden falle.
// Devolver true hace lo contrario: la transacción se corta y SQLite deshace todo (rollback).
const deshacerTodo = () => true;

export async function listar(): Promise<Charla[]> {
  const [resultado] = await (await db).executeSql('SELECT * FROM charlas ORDER BY day,time,room');
  return (resultado.rows.raw() as FilaCharla[]).map(fila => ({...fila, favorita: fila.favorita === 1}));
}

/**
 * Deja la tabla igual a la instantánea publicada, en una sola transacción (todo o nada):
 * - la charla que ya no viene se borra, y con ella su marca (si vuelve, vuelve sin marcar);
 * - la charla nueva entra sin marcar;
 * - la charla que sigue actualiza título, sala, etc. y NO se le toca la marca.
 * Como la marca nunca se lee ni se escribe acá, lo que el usuario marque o desmarque
 * mientras la petición está en viaje queda respetado.
 */
export async function reemplazarPrograma(fichas: Ficha[]): Promise<void> {
  const archivo = await db;
  const [guardadas] = await archivo.executeSql('SELECT id FROM charlas');
  const vigentes = new Set(fichas.map(f => f.id));
  const retiradas = (guardadas.rows.raw() as {id: string}[])
    .map(fila => fila.id)
    .filter(id => !vigentes.has(id));

  await archivo.transaction(tx => {
    for (const id of retiradas) {
      tx.executeSql('DELETE FROM charlas WHERE id = ?', [id], undefined, deshacerTodo);
    }
    for (const f of fichas) {
      tx.executeSql(
        `INSERT OR IGNORE INTO charlas (id, title, track, day, time, room, speaker, summary, favorita)
         VALUES (?,?,?,?,?,?,?,?,0)`,
        [f.id, f.title, f.track, f.day, f.time, f.room, f.speaker, f.summary], undefined, deshacerTodo);
      tx.executeSql(
        `UPDATE charlas SET title = ?, track = ?, day = ?, time = ?, room = ?, speaker = ?, summary = ?
         WHERE id = ?`,
        [f.title, f.track, f.day, f.time, f.room, f.speaker, f.summary, f.id], undefined, deshacerTodo);
    }
    tx.executeSql('INSERT OR REPLACE INTO ajustes (nombre, valor) VALUES (?,?)',
      [CLAVE_EDICION, 'si'], undefined, deshacerTodo);
  });
}

/** Deja la marca en el valor pedido. Repetir la misma orden no cambia el resultado. */
export async function marcar(id: string, favorita: boolean): Promise<void> {
  await (await db).executeSql('UPDATE charlas SET favorita = ? WHERE id = ?', [favorita ? 1 : 0, id]);
}

export async function hayEdicionGuardada(): Promise<boolean> {
  if ((await ajuste(CLAVE_EDICION, 'no')) === 'si') { return true; }
  // Instalaciones anteriores a esta corrección: no tienen la constancia, pero sí charlas guardadas.
  const [resultado] = await (await db).executeSql('SELECT COUNT(*) AS total FROM charlas');
  return resultado.rows.item(0).total > 0;
}

export async function ajuste(nombre: string, defecto: string): Promise<string> {
  const [rs] = await (await db).executeSql('SELECT valor FROM ajustes WHERE nombre = ?', [nombre]);
  return rs.rows.length ? rs.rows.item(0).valor : defecto;
}
export async function configurar(nombre: string, valor: string): Promise<void> {
  await (await db).executeSql('INSERT OR REPLACE INTO ajustes (nombre, valor) VALUES (?,?)', [nombre, valor]);
}
