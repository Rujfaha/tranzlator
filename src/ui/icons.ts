import { cssInterop } from "nativewind";
import { Check, Copy, Settings, X } from "lucide-react-native";

// Lets icons take their color from a `text-*` class instead of a hex prop.
for (const Icon of [Check, Copy, Settings, X]) {
  cssInterop(Icon, { className: { target: "style", nativeStyleToProp: { color: true } } });
}

export { Check, Copy, Settings, X };
