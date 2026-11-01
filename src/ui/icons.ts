import { cssInterop } from "nativewind";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleAlert, CircleCheck, ClipboardPaste, Copy, Info, KeyRound,
  Settings, X,
} from "lucide-react-native";

// Lets icons take their color from a `text-*` class instead of a hex prop.
for (const Icon of [
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleAlert, CircleCheck, ClipboardPaste, Copy, Info, KeyRound,
  Settings, X,
]) {
  cssInterop(Icon, { className: { target: "style", nativeStyleToProp: { color: true } } });
}

export {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleAlert, CircleCheck, ClipboardPaste, Copy, Info, KeyRound,
  Settings, X,
};
