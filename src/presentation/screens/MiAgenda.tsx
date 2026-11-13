// PANTALLA Mi agenda: las charlas marcadas por el usuario.
import React from 'react';
import {Text,View} from 'react-native';
import {soloFavoritas} from '../../domain/agenda';
import {Lista} from '../components/componentes';
import {programa,usePrograma} from '../viewmodel/usePrograma';

export function MiAgenda() {
  const {charlas} = usePrograma();
  const mias = soloFavoritas(charlas);
  return <View>
    {mias.length===0 && <Text>Todavía no agregaste charlas.</Text>}
    <Lista fichas={mias} abrir={programa.abrirFicha}/>
  </View>;
}
