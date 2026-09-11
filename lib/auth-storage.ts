/**
 * Where the login session is saved on the device.
 *
 * SecureStore (phone keychain) cannot hold big values (~2KB limit).
 * A Supabase session is often larger than that. Official pattern:
 * - a small AES key lives in SecureStore
 * - the encrypted session lives in AsyncStorage
 *
 * Web and server-render have no SecureStore, so we fall back safely.
 */
import "react-native-get-random-values";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isBrowser = typeof window !== "undefined";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  };
}

async function canUseSecureStore(): Promise<boolean> {
  if (!isBrowser || Platform.OS === "web") {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function writeSecret(key: string, value: string): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      // Fall through to AsyncStorage so login still persists.
    }
  }
  await AsyncStorage.setItem(`lifeshield-secret:${key}`, value);
}

async function readSecret(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    try {
      const fromSecure = await SecureStore.getItemAsync(key);
      if (fromSecure) {
        return fromSecure;
      }
    } catch {
      // Fall through.
    }
  }
  return AsyncStorage.getItem(`lifeshield-secret:${key}`);
}

async function deleteSecret(key: string): Promise<void> {
  try {
    if (await canUseSecureStore()) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // Ignore — still clear AsyncStorage below.
  }
  try {
    await AsyncStorage.removeItem(`lifeshield-secret:${key}`);
  } catch {
    // Stay alive.
  }
}

/**
 * Matches the current Supabase Expo docs: encrypt the session, keep the
 * tiny key in SecureStore, keep the blob in AsyncStorage.
 */
class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1),
    );
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await writeSecret(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await readSecret(key);
    if (!encryptionKeyHex) {
      return null;
    }
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) {
        return encrypted;
      }
      return await this.decrypt(key, encrypted);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await this.encrypt(key, value);
      await AsyncStorage.setItem(key, encrypted);
    } catch {
      // Last resort: store unencrypted so the user is not signed out
      // if encryption fails on a given platform.
      await AsyncStorage.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Continue.
    }
    await deleteSecret(key);
  }
}

/**
 * Expo web: use the browser's own localStorage.
 * Encrypted AsyncStorage + PKCE was a common reason sign-up "succeeded"
 * in the network tab but the app showed a vague failure afterward.
 */
function createWebStorage() {
  return {
    getItem: async (key: string) => {
      try {
        if (typeof localStorage === "undefined") {
          return null;
        }
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        if (typeof localStorage === "undefined") {
          return;
        }
        localStorage.setItem(key, value);
      } catch {
        // Quota / private mode — stay alive; session may not persist.
      }
    },
    removeItem: async (key: string) => {
      try {
        if (typeof localStorage === "undefined") {
          return;
        }
        localStorage.removeItem(key);
      } catch {
        // Stay alive.
      }
    },
  };
}

export function createAuthStorage() {
  if (!isBrowser) {
    return createMemoryStorage();
  }
  if (Platform.OS === "web") {
    return createWebStorage();
  }
  return new LargeSecureStore();
}

export { isBrowser };
