import { Anuphan_400Regular } from "@expo-google-fonts/anuphan/400Regular";
import { Anuphan_500Medium } from "@expo-google-fonts/anuphan/500Medium";
import { Anuphan_600SemiBold } from "@expo-google-fonts/anuphan/600SemiBold";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ToastProvider } from "../ui/Toast";
import "../../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Anuphan_400Regular, Anuphan_500Medium, Anuphan_600SemiBold });
  const ready = loaded || error != null; // a failed font load must not block the app
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  return ready ? (
    <ToastProvider>
      <Slot />
    </ToastProvider>
  ) : null;
}
