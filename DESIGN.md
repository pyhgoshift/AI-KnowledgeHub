# Yuxi Desktop — Design Direction

Yuxi uses a research-console design inspired by the Together AI reference on
Refero Styles. It is optimized for a dense Electron workspace where chat,
knowledge bases, agents, model configuration, and technical status coexist.

## Principles

- Glacier-white work surfaces with near-black navy text.
- One clear periwinkle signal for selected and focused states.
- Flat components with 1px hairline borders and no decorative shadows.
- Consistent 4px radius for cards, buttons, tabs, badges, and inputs.
- Sans-serif for content; monospace for navigation, labels, badges, and metadata.
- Pastel fills communicate categories: mint, sky, blush, and peach.
- Hierarchy comes from type size and weight, not excessive color.

## Core tokens

| Role | Value |
| --- | --- |
| Ink | `#010120` |
| Paper | `#ffffff` |
| Secondary text | `#4d4d4d` |
| Hairline | `#d6d6d6` |
| Active indicator | `#bdbbff` |
| Mint category | `#c8f6f9` |
| Sky category | `#c1dff9` |
| Blush category | `#fde3f6` |
| Peach category | `#ffdccd` |
| Radius | `4px` |
| Spacing base | `4px` |

## Electron behavior

- The left rail is permanent desktop navigation and may collapse to icon width.
- Active navigation uses a periwinkle left rule, not a filled brand-color block.
- Window chrome should remain quiet and draggable areas must not contain controls.
- Dense technical metadata may use the monospace family; Korean content remains in
  the primary UI font for readability.
