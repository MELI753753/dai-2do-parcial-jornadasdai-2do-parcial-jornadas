// VIEWMODEL de la Mesa (panel del laboratorio): estado, try/catch y pedidos al Repository.
import {useCallback, useEffect, useState} from 'react';
import {laboratorioRepository} from '../../data/LaboratorioRepository';
import type {AjustesLab, ClaveLab} from '../../data/LaboratorioRepository';

export function useMesaViewModel() {
  const [valores, setValores] = useState<AjustesLab | null>(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    // Montaje: lee los ajustes una sola vez ([] = solo al aparecer).
    let vivo = true;
    laboratorioRepository.leer()
      .then(leidos => { if (vivo) { setValores(leidos); } })
      .catch(() => { if (vivo) { setAviso('No se pudieron leer los ajustes.'); } });
    // Desmontaje: si la pantalla ya se fue, la respuesta que llegue tarde no toca el estado.
    return () => { vivo = false; };
  }, []);

  const cambiar = useCallback(async (clave: ClaveLab, valor: string) => {
    try {
      await laboratorioRepository.cambiar(clave, valor);
      setValores(previos => (previos ? {...previos, [clave]: valor} : previos));
      setAviso('');
    } catch {
      setAviso('No se pudo guardar el ajuste.');
    }
  }, []);

  return {valores, aviso, cambiar, peticiones: laboratorioRepository.peticiones()};
}
