import { cssInterop } from "nativewind";
import { Text, View } from "react-native";
import Svg, { ClipPath, Defs, G, Path } from "react-native-svg";

// Lets the Svg root take its colour from a `text-*` class (the paths use currentColor) instead of a hex prop.
cssInterop(Svg, { className: { target: "style", nativeStyleToProp: { color: true } } });

// Two speech bubbles offset diagonally: outline behind, solid in front ("two voices, two languages").
// One colour keeps the mark to a single Svg root; the clip cuts a gap in the back outline where the front bubble overlaps.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <View className="flex-row items-center gap-2">
      <Svg width={size} height={size} viewBox="0 0 28 28" aria-hidden className="text-ink">
        <Defs>
          <ClipPath id="logo-gap">
            <Path
              clipRule="evenodd"
              d="M0 0h28v28H0z M14 9.25h8a5.75 5.75 0 0 1 5.75 5.75v5a5.75 5.75 0 0 1-5.75 5.75h-8a5.75 5.75 0 0 1-5.75-5.75v-5A5.75 5.75 0 0 1 14 9.25z"
            />
          </ClipPath>
        </Defs>
        <G clipPath="url(#logo-gap)">
          <Path
            d="M6 2h8a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4H9l-3.5 3v-3H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"
            fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round"
          />
        </G>
        <Path
          d="M14 11h8a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4v3.5L18.5 24H14a4 4 0 0 1-4-4v-5a4 4 0 0 1 4-4z"
          fill="currentColor" stroke="currentColor" strokeWidth={1} strokeLinejoin="round"
        />
      </Svg>
      <Text style={{ fontSize: Math.round((size * 5) / 7), letterSpacing: -0.4 }} className="font-sans-semibold text-ink">tranzlator</Text>
    </View>
  );
}
