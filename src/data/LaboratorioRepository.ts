// REPOSITORY del laboratorio: los tres ajustes de la Mesa y el contador de peticiones.
// Antes la pantalla Mesa leía y escribía estos ajustes directo en la base.
import {solicitudes} from '../lab/servicio';
import {ajuste, configurar} from './archivo';

export type AjustesLab = {revision: string; disponible: string; lenta: string};
export type ClaveLab = keyof AjustesLab;

export const laboratorioRepository = {
  async leer(): Promise<AjustesLab> {
    const [revision, disponible, lenta] = await Promise.all([
      ajuste('revision', '1'), ajuste('disponible', 'si'), ajuste('lenta', 'no'),
    ]);
    return {revision, disponible, lenta};
  },
  async cambiar(clave: ClaveLab, valor: string): Promise<void> {
    await configurar(clave, valor);
  },
  /** Peticiones hechas desde que arrancó el proceso (incluye las que fallaron). */
  peticiones(): number {
    return solicitudes;
  },
};
