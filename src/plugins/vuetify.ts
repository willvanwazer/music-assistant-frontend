/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import "@mdi/font/css/materialdesignicons.css";
import "material-design-icons-iconfont/dist/material-design-icons.css";
import { md } from "vuetify/iconsets/md";
import { aliases as defaultAliases, mdi } from "vuetify/iconsets/mdi";
import "./vuetify.css";

// Composables
import { IconAliases, createVuetify } from "vuetify";

const aliases: IconAliases = {
  ...defaultAliases,
};

export default createVuetify(
  // https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
  {
    icons: {
      defaultSet: "mdi",
      aliases,
      sets: {
        md,
        mdi,
      },
    },
    display: {
      mobileBreakpoint: "md",
      thresholds: {
        xs: 0,
        sm: 340,
        md: 540,
        lg: 800,
        xl: 1280,
      },
    },
    theme: {
      // Use a private id rather than the well-known
      // "vuetify-theme-stylesheet" default: anything injecting CSS into
      // the page (extensions, userscripts, other libraries) can target
      // the public id by name and overwrite the runtime CSS variables.
      stylesheetId: "mass-vuetify-theme",
      defaultTheme: "dark",
      // Keep in lockstep with the :root / .dark tokens in styles/style.css.
      themes: {
        light: {
          dark: false,
          colors: {
            fg: "#1c1c1e",
            background: "#ffffff",
            surface: "#ffffff",
            overlay: "#ededf0ff",
            panel: "#f6f6f8",
            default: "#ffffff",
            primary: "#6462ea",
            // Vuetify's own .bg-secondary utility loads after Tailwind's and
            // wins, so its secondary must be the neutral --secondary fill, not
            // Vuetify's default teal, or every secondary button turns teal.
            secondary: "#ededf0",
            "on-secondary": "#1c1c1e",
          },
        },
        dark: {
          dark: true,
          colors: {
            fg: "#f5f5f5",
            background: "#181818",
            surface: "#242424",
            overlay: "#181818",
            panel: "#242424",
            default: "#000000",
            primary: "#7c7fe6",
            secondary: "#2c2c2e",
            "on-secondary": "#f5f5f5",
          },
        },
      },
    },
  },
);
