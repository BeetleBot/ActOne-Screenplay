# Prose export fonts

Sources: https://github.com/google/fonts/tree/main/ofl

- Literata: `literata` (Classic)
- Source Serif 4: `sourceserif4` (Treatment)
- Inter: `inter` (Modern)
- EB Garamond: `ebgaramond` (Literary)

Each family includes its upstream SIL Open Font License in the adjacent `*-OFL.txt` file. These licenses permit bundling and embedding. Static regular, bold, italic, and bold italic instances were generated with fonttools from the upstream variable TTFs (weight 400/700, optical size 12 where present). Name records identify static faces. Original copyright/license records are retained. Courier Prime (Manuscript) uses the existing app fonts.

Regenerate from the repository root with `python scripts/bundle-prose-fonts.py` (requires fonttools and network access).
