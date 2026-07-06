# AI.QB Mobile Application (Expo SDK 54)

This is the mobile frontend for **AI.QB** built with React Native and Expo SDK 54. It is designed to compile as a standalone production-ready Android APK that installs cleanly on all modern Android devices (including Android 14 / targetSdkVersion 34).

---

## ⚠️ CRITICAL DEPENDENCY RULES (Preventing Native Crashes)

This application uses **Expo SDK 54** (`react-native` version `0.81.5`, `expo-modules-core` version `3.0.30`). To prevent low-level Kotlin API mismatches (which cause silent `NoSuchMethodError` crashes on physical devices), **always adhere to the following rules**:

1. **Direct Peer Dependency Locking**:
   - **`expo-font`** must be locked at **`~14.0.11`**. Do **NOT** upgrade `expo-font` to `56.x` or allow automated npm updates to upgrade it. Upgrading it compiles native bytecode that expects a newer `expo-modules-core`, crashing the app immediately at boot.
   - **`react-native-webview`** must be locked at **`13.15.0`**.
   - **`react-native-worklets`** must be locked at **`0.5.1`** (required for Reanimated v4).
2. **Adding New Native Packages**:
   - When installing packages with native code, **always** use `npx expo install <package-name>` instead of `npm i`. This ensures Expo resolves the version matching SDK 54.
   - Run **`npx expo-doctor`** after any dependency changes to ensure there are no version clashes or duplicate native libraries.

---

## 🔑 Production Release Signing (`release.keystore`)

To prevent antivirus scanners (like Tecno's HiOS Phone Master) from blocking the app as an "unknown developer signature", standalone APK builds are signed using a unique **Private Custom Keystore** rather than the generic public debug key.

### Keystore Backup
- **Master Location**: `mobile/release.keystore` (This master copy is safely backed up in the mobile directory to prevent it from being deleted during clean builds).
- **Auto-Injection**: The `manage.bat` tool automatically copies this keystore to `mobile/android/app/release.keystore` before compiling the production bundle.

---

## 🛠️ How to Compile a Standalone Production APK

All build processes are fully automated inside the main project directory. To build a fresh, optimized, and signed **`QuestionShaper.apk`**:

1. Open a terminal in the root directory `c:\questionshaper`.
2. Double-click or run **`manage.bat`**.
3. Select **`[6] Build Production Mobile APK`**.
4. The tool will:
   - Clean all previous stale native builds.
   - Run Expo Prebuild with `--no-install` (preserving our locked dependency tree).
   - Apply native target SDK patches (`minSdkVersion 24`, `targetSdkVersion 34`) and inject private release signing credentials.
   - Compile the optimized `.apk` using JDK 17.
   - Save the finalized package at **`production/QuestionShaper.apk`**.

---

## 📲 Installing & Testing

1. **Clean Installation**: **Uninstall** any previous crashing versions of `AI.QB` from your physical device first (this clears old signing caches).
2. **Transfer**: Transfer the newly compiled APK from `production/QuestionShaper.apk` to your phone.
3. **Run**: Tap the APK in your phone's File Manager and select **Install Anyway**. The app will launch instantly with zero crashes and exhibit premium, state-of-the-art UI/UX!
