import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { parseLangs, type SavedLangs } from "./langs";
import { type AiSettings, parseSettings } from "./providers";

const STORE_KEY = "tranzlator.ai";
const LANGS_KEY = "tranzlator.langs";

// Web: localStorage (may be blocked or throw). Native: Keychain/Keystore via SecureStore, never AsyncStorage.
const read = async (key: string) => (Platform.OS === "web" ? localStorage.getItem(key) : await SecureStore.getItemAsync(key));
const write = async (key: string, raw: string) => {
  if (Platform.OS === "web") localStorage.setItem(key, raw);
  else await SecureStore.setItemAsync(key, raw);
};

export async function loadSettings(): Promise<AiSettings | null> {
  try {
    return parseSettings(await read(STORE_KEY));
  } catch {
    return null;
  }
}

// If storage is blocked the key simply lasts for this session only.
export async function saveSettings(s: AiSettings): Promise<void> {
  try {
    await write(STORE_KEY, JSON.stringify(s));
  } catch {}
}

// The chosen target language and the recent-language tabs, kept across launches. Unreadable: the defaults.
export async function loadLangs(): Promise<SavedLangs> {
  try {
    return parseLangs(await read(LANGS_KEY));
  } catch {
    return parseLangs(null);
  }
}

export async function saveLangs(v: SavedLangs): Promise<void> {
  try {
    await write(LANGS_KEY, JSON.stringify(v));
  } catch {}
}
