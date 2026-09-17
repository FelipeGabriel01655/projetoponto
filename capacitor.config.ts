/**
 * Configuração pronta para empacotar o Corre.ai Motoboy com Capacitor
 * (App Store e Google Play a partir da mesma base de código).
 *
 * Para gerar os apps nativos:
 *   bun add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
 *   bunx cap add ios && bunx cap add android
 */
const config = {
  appId: "ai.corre.motoboy",
  appName: "Corre.ai Motoboy",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    Geolocation: {},
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
