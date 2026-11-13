// PANTALLA principal: marco, título, aviso y pestañas. Elige qué pantalla dibujar según el ViewModel.
import React,{useEffect} from 'react';
import {BackHandler,ScrollView,Text,View} from 'react-native';
import {SECCIONES} from '../../domain/agenda';
import {Opcion,s} from '../components/componentes';
import {programa,usePrograma} from '../viewmodel/usePrograma';
import {Catalogo} from './Catalogo';
import {Detalle} from './Detalle';
import {Mesa} from './Mesa';
import {MiAgenda} from './MiAgenda';

export function Portada() {
  const {seccion,fichaId,aviso} = usePrograma();
  useEffect(()=>{
    // Montaje: escucha el botón Atrás de Android. Qué hacer lo decide el ViewModel.
    const sub = BackHandler.addEventListener('hardwareBackPress',programa.retroceder);
    // Desmontaje: deja de escuchar (lo que se prende al aparecer se apaga al irse).
    return ()=>sub.remove();
  },[]);
  return <View style={s.pagina}><Text>Jornadas del Sur</Text>
    <Text style={s.titulo}>{fichaId?'Detalle':seccion}</Text>
    {aviso!=='' && <Text style={s.texto}>{aviso}</Text>}
    <ScrollView style={{flex:1}}>
      {fichaId ? <Detalle/>
      : seccion==='Programa' ? <Catalogo/>
      : seccion==='Mesa' ? <Mesa/> : <MiAgenda/>}
    </ScrollView>
    {!fichaId && <View style={s.fila}>{SECCIONES.map(t=>
      <Opcion key={t} texto={t} activa={seccion===t} accion={()=>programa.elegirSeccion(t)}/>)}</View>}
  </View>;
}
