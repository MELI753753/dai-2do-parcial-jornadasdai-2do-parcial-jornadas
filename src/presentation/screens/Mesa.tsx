// PANTALLA Mesa (laboratorio): dibuja los ajustes que le da su ViewModel. Ya no toca la base.
import React from 'react';
import {Text,View} from 'react-native';
import {s,Opcion} from '../components/componentes';
import {useMesaViewModel} from '../viewmodel/useMesaViewModel';

export function Mesa() {
  const {valores,aviso,cambiar,peticiones} = useMesaViewModel();
  return <View><Text style={s.texto}>Peticiones en esta sesión: {peticiones}</Text>
    {aviso!=='' && <Text style={s.texto}>{aviso}</Text>}
    <Text>Edición del programa</Text><View style={s.fila}>{['1','2','3','4'].map(v=>
      <Opcion key={v} texto={'v'+v} activa={valores?.revision===v} accion={()=>cambiar('revision',v)}/>)}</View>
    <Text>Servicio disponible</Text><View style={s.fila}>{['si','no'].map(v=>
      <Opcion key={v} texto={v} activa={valores?.disponible===v} accion={()=>cambiar('disponible',v)}/>)}</View>
    <Text>Demora de cada petición</Text><View style={s.fila}>{['no','si'].map(v=>
      <Opcion key={v} texto={v==='si'?'8 segundos':'1,4 segundos'} activa={valores?.lenta===v} accion={()=>cambiar('lenta',v)}/>)}</View>
  </View>;
}
