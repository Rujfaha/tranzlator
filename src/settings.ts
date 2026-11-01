import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { type AiSettings, parseSettings } from "./providers";

const STORE_KEY = "tranzlator.ai";

// Web: localStorage (may be blocked or throw). Native: Keychain/Keystore via SecureStore, never AsyncStorage.
export async function loadSettings(): Promise<AiSettings | null> {
  try {
    const raw = Platform.OS === "web" ? localStorage.getItem(STORE_KEY) : await SecureStore.getItemAsync(STORE_KEY);
    return parseSettings(raw);
  } catch {
    return null;
  }
}

// If storage is blocked the key simply lasts for this session only.
export async function saveSettings(s: AiSettings): Promise<void> {
  const raw = JSON.stringify(s);
  try {
    if (Platform.OS === "web") localStorage.setItem(STORE_KEY, raw);
    else await SecureStore.setItemAsync(STORE_KEY, raw);
  } catch {}
}
