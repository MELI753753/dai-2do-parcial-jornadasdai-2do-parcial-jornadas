// PANTALLA Detalle: muestra la ficha abierta y avisa "volver" o "marcar".
import React from 'react';
import {Text,View} from 'react-native';
import {buscarCharla} from '../../domain/agenda';
import {Opcion,s} from '../components/componentes';
import {programa,usePrograma} from '../viewmodel/usePrograma';

export function Detalle() {
  const {charlas,fichaId,avisoMarca} = usePrograma();
  const ficha = buscarCharla(charlas,fichaId);
  return <View><Opcion texto="Volver" accion={programa.cerrarFicha}/>
    {ficha ? <View><Text style={s.titulo}>{ficha.title}</Text><Text style={s.texto}>
      Día {ficha.day} · {ficha.time} · {ficha.room}</Text>
      <Text>{ficha.speaker}</Text><Text style={s.texto}>{ficha.summary}</Text>
      <Opcion texto={ficha.favorita?'Quitar de mi agenda':'Agregar a mi agenda'}
        accion={()=>programa.alternarFavorita(ficha.id)}/>
      {avisoMarca!=='' && <Text style={s.texto}>{avisoMarca}</Text>}
    </View> : <Text style={s.texto}>Esta charla ya no figura en el programa.</Text>}
  </View>;
}
