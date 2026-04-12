# Bangla Font Setup

## Noto Sans Bengali (Recommended)

1. Download from: https://fonts.google.com/noto/specimen/Noto+Sans+Bengali
2. Extract `NotoSansBengali-Regular.ttf`
3. Place it in this directory: `src/main/resources/fonts/NotoSansBengali-Regular.ttf`

The PDF service will automatically detect and embed it.

## Fallback
If the font file is not found, the system falls back to **Helvetica** (built-in).
Bangla text will NOT render correctly without the font file, though the PDF will still generate.

## Other Compatible Fonts (tested with OpenPDF)
- Kalpurush.ttf
- SolaimanLipi.ttf
- NotoSerifBengali-Regular.ttf
