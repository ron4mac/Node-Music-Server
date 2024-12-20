import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {languageOptions: { globals: {...globals.browser, ...globals.node} }},
  pluginJs.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["warn", { "args": "none" }],
      "no-undef": "warn",
      "no-unreachable": "warn",
      "no-case-declarations": "off"
    },
    languageOptions: {
      globals: {
        postAction: "readonly",
        displayCurrent: "readonly",
        displayCurrentTrack: "readonly",
        currentStream: "writeable",
        showLocalAudio: "readonly",
        laudioelm: "writeable",
        modal: "readonly",
        nowPlaying: "writeable",
        services: "readonly",
        Favorites: "readonly",
        Tunein: "readonly",
        Calm: "readonly",
        Pand: "readonly",
        Spot: "readonly",
        Fileman: "readonly",
        Playlists: "readonly"
      }
    }
  },
  {
    ignores: ["sv_**"]
  }
];
