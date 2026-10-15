import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
export const storage = {
  get: (key:string) => AsyncStorage.getItem(key),
  set: (key:string,value:string) => AsyncStorage.setItem(key,value),
  remove: (key:string) => AsyncStorage.removeItem(key),
  token: async () => Platform.OS==='web' ? sessionStorage.getItem('alltag.token') : SecureStore.getItemAsync('alltag.token'),
  setToken: async (value:string|null) => { if(Platform.OS==='web') { if(value)sessionStorage.setItem('alltag.token',value);else sessionStorage.removeItem('alltag.token'); } else if(value) await SecureStore.setItemAsync('alltag.token',value); else await SecureStore.deleteItemAsync('alltag.token'); },
};
