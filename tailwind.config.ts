import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ["var(--font-display)", "Cormorant Garamond", "serif"],
                body: ["var(--font-body)", "Jost", "sans-serif"],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                rose: {
                    DEFAULT: "#C8A5A5",
                    light: "#EDD8D8",
                    lighter: "#F7EFEF",
                },
                mauve: {
                    DEFAULT: "#9B7D96",
                    light: "#D4C1D1",
                    dark: "#7D6078",
                },
                cream: "#FAF6F1",
                warm: "#EDE4D8",
                brandtext: "#3A2E2E",
                brandmuted: "#7A6A6A",
                brandgreen: "#6B8F71",
                brand: {
                    50: "#F7EFEF",
                    100: "#F0E2E2",
                    200: "#EDD8D8",
                    300: "#D4C1D1",
                    400: "#C8A5A5",
                    500: "#9B7D96",
                    600: "#7D6078",
                    700: "#7A6A6A",
                    800: "#3A2E2E",
                    900: "#2A2020",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            spacing: {
                "1": "4px",
                "2": "8px",
                "3": "12px",
                "4": "16px",
                "5": "20px",
                "6": "24px",
                "8": "32px",
                "10": "40px",
                "12": "48px",
                "16": "64px",
                "18": "72px",
            },
        },
    },
    plugins: [],
};
export default config;