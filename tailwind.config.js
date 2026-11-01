/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  future: { hoverOnlyWhenSupported: true }, // hover styles only where (hover: hover), per spec
  darkMode: "class", // no dark mode in the spec; "media" makes NativeWind throw on web when the app pins a light color scheme
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        graphite: "#262626",
        muted: "#737373",
        disabled: "#A3A3A3",
        line: "#EBEBEB",
        chip: "#F1F1F1",
        shell: "#F5F5F5",
        paper: "#FFFFFF",
        danger: "#E33F4A",
      },
      borderRadius: { inner: "6px", element: "12px", container: "16px", panel: "20px" },
      // Anuphan ships one file per weight, so the weight lives in the family name.
      // Keys are not `medium`/`semibold`: those would also match Tailwind's font-weight utilities.
      fontFamily: {
        sans: ["Anuphan_400Regular"],
        "sans-medium": ["Anuphan_500Medium"],
        "sans-semibold": ["Anuphan_600SemiBold"],
      },
      fontSize: {
        note: ["13px", "18px"],
        body: ["15px", "22px"],
        input: ["17px", "26px"],
        translation: ["22px", "30px"],
        title: ["28px", "36px"],
      },
      boxShadow: {
        card: "0 2px 4px rgba(0,0,0,0.05), 0 4px 8px rgba(0,0,0,0.10)",
        "card-hover": "0 3px 6px rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.12)",
      },
      screens: { wide: "768px" },
    },
  },
  plugins: [],
};
