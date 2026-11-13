// ENTRADA de la app: le avisa al ViewModel que arrancó y dibuja la portada cuando está lista.
import React,{useEffect} from 'react';
import {Text} from 'react-native';
import {Portada} from './src/presentation/screens/Portada';
import {programa,usePrograma} from './src/presentation/viewmodel/usePrograma';

// taskKey y offlineStart los manda MainActivity.kt: el identificador de la tarea de Android
// (sobrevive si Android mata el proceso) y si se pidió arrancar sin servicio.
type Inicio = {taskKey:string; offlineStart?:boolean};
export default function App({taskKey,offlineStart}:Inicio) {
  const {abierta} = usePrograma();
  useEffect(()=>{
    void programa.iniciar(taskKey ?? '',offlineStart===true);
  },[taskKey,offlineStart]);
  return abierta ? <Portada/> : <Text>Abriendo agenda…</Text>;
}
