# Assistant Instructions & Guidelines

This file is reserved for instructions, developer guidelines, and preferences. These rules will persist across agent sessions.

## 🚫 Critical Guidelines
1. **Never Start Server Processes Directly**: Do not launch dev servers (`start_backend.bat`, `run.bat`, `npm run dev`) in the background. Ask the developer to run them via `manage.bat` and report back.
2. **Backend Status Defaults**: Generated AI questions must save with the status `DRAFT` (unless failing validation, in which case they default to `REJECTED`).
3. **No Placeholders**: Avoid dummy mock values; always use real logic or generate assets directly.
4. **Dynamic Question Rendering & Metadata Filtration**: For dynamic questions, exclude rendering redundant raw metadata keys (like `questionType`, `sources`, `stimulus`, `difficulty`, `marks`, `language`, `bloomLevel` etc.) and the raw `sub_parts` table directly under the question text if the question type is `CQ_DESCRIPTIVE` or if the `hideSubPartsTable`/`hide_sub_parts` flag is true in `dynamicData`. Rely on the standard badges and toggle-buttons (Show Answer/Explanation) to display these values cleanly.

5. **Responsive & Safe-Area UI**: All user interface elements across Web, Tablet, and Mobile must be fully responsive without overlap. On React Native (mobile), always use `SafeAreaProvider` and `SafeAreaView` from `react-native-safe-area-context` (or `useSafeAreaInsets` hook) instead of the default `react-native` `SafeAreaView` to prevent status bar or notch overlaps on Android and iOS.

## 📝 Developer Custom Guidelines
*(Add your instructions here and the assistant will read and follow them in every session)*

