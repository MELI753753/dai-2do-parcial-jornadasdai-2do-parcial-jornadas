// PANTALLA Programa: dibuja los filtros y la lista que le da el ViewModel, y avisa los toques.
// No tiene estado propio ni useEffect: si se desmonta y vuelve, no pierde filtros ni pide datos.
import React from 'react';
import {Text,View} from 'react-native';
import {DIAS,TEMAS,filtrarCharlas} from '../../domain/agenda';
import {Lista,Opcion,s} from '../components/componentes';
import {programa,usePrograma} from '../viewmodel/usePrograma';

export function Catalogo() {
  const {charlas,dia,tema,carga,hayEdicion} = usePrograma();
  const visibles = filtrarCharlas(charlas,dia,tema);
  return <View>
    <View style={s.fila}>{DIAS.map((t,i)=>
      <Opcion key={t} texto={t} activa={dia===i} accion={()=>programa.elegirDia(i)}/>)}</View>
    <View style={s.fila}>{TEMAS.map(t=>
      <Opcion key={t} texto={t} activa={tema===t} accion={()=>programa.elegirTema(t)}/>)}</View>
    <Opcion texto="Actualizar" accion={programa.actualizar}/>
    {carga==='cargando' && <Text>Consultando programa…</Text>}
    {!hayEdicion ? (carga==='error' && <Opcion texto="Reintentar" accion={programa.actualizar}/>)
      : charlas.length===0 ? <Text style={s.texto}>La edición vigente está sin charlas programadas.</Text>
      : visibles.length===0 ? <Text style={s.texto}>No hay charlas para estos filtros.</Text>
      : <Lista fichas={visibles} abrir={programa.abrirFicha}/>}
  </View>;
}
