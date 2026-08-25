import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import { alpha, darken } from "@mui/material/styles";
import { ChevronRightIcon } from "./Icons";

export interface ContextMenuItemDef {
  label: string;
  enabled?: boolean;
  action?: () => void;
  children?: ContextMenuItemDef[];
}

export type ContextMenuItem = ContextMenuItemDef | "separator";

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

interface MenuLayerProps {
  items: ContextMenuItem[];
  left: number;
  top: number;
  depth: number;
  onClose: () => void;
  closeAll: () => void;
  onEnter?: () => void;
}

const MARGIN = 8;
const SUBMENU_OPEN_DELAY = 80;
const SUBMENU_CLOSE_DELAY = 140;

function MenuLayer({ items, left, top, depth, onClose, closeAll, onEnter }: MenuLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const typeaheadTimer = useRef<number | null>(null);
  const typeahead = useRef("");
  const [position, setPosition] = useState({ left, top });
  const [submenu, setSubmenu] = useState<{
    index: number;
    items: ContextMenuItem[];
    left: number;
    top: number;
  } | null>(null);

  const clearTimers = () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const closeSubmenuSoon = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setSubmenu(null), SUBMENU_CLOSE_DELAY);
  };

  const calculateSubmenuPosition = (index: number, children: ContextMenuItem[]) => {
    const anchor = itemRefs.current[index];
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const estimatedHeight = Math.min(window.innerHeight - MARGIN * 2, children.length * 28 + 16);
    const estimatedWidth = 210;
    const openRight = rect.right + estimatedWidth <= window.innerWidth - MARGIN;
    const nextLeft = openRight ? rect.right : Math.max(MARGIN, rect.left - estimatedWidth);
    const nextTop = Math.min(Math.max(MARGIN, rect.top), Math.max(MARGIN, window.innerHeight - estimatedHeight - MARGIN));
    setSubmenu({ index, items: children, left: nextLeft, top: nextTop });
  };

  const openSubmenu = (index: number, children: ContextMenuItem[], immediate = false) => {
    clearTimers();
    const open = () => calculateSubmenuPosition(index, children);
    if (immediate) open();
    else openTimer.current = window.setTimeout(open, SUBMENU_OPEN_DELAY);
  };

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const nextLeft = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, window.innerWidth - layer.offsetWidth - MARGIN));
    const nextTop = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, window.innerHeight - layer.offsetHeight - MARGIN));
    setPosition((current) => current.left === nextLeft && current.top === nextTop ? current : { left: nextLeft, top: nextTop });
  }, [left, top, items]);

  useEffect(() => {
    layerRef.current?.focus();
    return clearTimers;
  }, []);

  useEffect(() => () => {
    if (typeaheadTimer.current !== null) window.clearTimeout(typeaheadTimer.current);
  }, []);

  const focusItem = (index: number) => itemRefs.current[index]?.focus();
  const enabledIndexes = items.reduce<number[]>((result, item, index) => {
    if (item !== "separator" && item.enabled !== false) result.push(index);
    return result;
  }, []);

  const moveFocus = (current: number, direction: 1 | -1) => {
    if (enabledIndexes.length === 0) return;
    const currentPosition = enabledIndexes.indexOf(current);
    const nextPosition = currentPosition < 0
      ? (direction > 0 ? 0 : enabledIndexes.length - 1)
      : (currentPosition + direction + enabledIndexes.length) % enabledIndexes.length;
    focusItem(enabledIndexes[nextPosition]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const currentIndex = Number(target.dataset.itemIndex);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(currentIndex, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(currentIndex, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(enabledIndexes[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(enabledIndexes[enabledIndexes.length - 1]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      event.preventDefault();
      onClose();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeahead.current += event.key.toLocaleLowerCase();
      if (typeaheadTimer.current !== null) window.clearTimeout(typeaheadTimer.current);
      typeaheadTimer.current = window.setTimeout(() => {
        typeahead.current = "";
      }, 700);
      const match = enabledIndexes.find((index) => {
        const item = items[index];
        return item !== "separator" && item.label.toLocaleLowerCase().startsWith(typeahead.current);
      });
      if (match !== undefined) {
        event.preventDefault();
        focusItem(match);
      }
    }
  };

  return (
    <Box
      ref={layerRef}
      className="context-menu"
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => {
        onEnter?.();
        clearTimers();
      }}
      onMouseLeave={closeSubmenuSoon}
      sx={(theme) => ({
        position: "fixed",
        left: position.left,
        top: position.top,
        zIndex: 1500 + depth,
        minWidth: 190,
        maxWidth: "min(320px, calc(100vw - 16px))",
        maxHeight: "calc(100vh - 16px)",
        overflowY: "auto",
        py: 0.5,
        bgcolor: "var(--bg-dropdown)",
        color: "var(--dropdown-text)",
        border: "1px solid",
        borderColor: theme.palette.divider,
        borderRadius: '8px',
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
        outline: "none",
        scrollbarWidth: "thin",
      })}
    >
      <MenuList disablePadding dense>
        {items.map((item, index) => {
        if (item === "separator") return <Divider key={`separator-${index}`} sx={{ my: 0.5 }} />;
        const hasChildren = !!item.children?.length;
        const disabled = item.enabled === false;
        return (
          <MenuItem
            key={`item-${index}`}
            ref={(element) => { itemRefs.current[index] = element; }}
            data-item-index={index}
            role="menuitem"
            aria-haspopup={hasChildren ? "menu" : undefined}
            aria-expanded={hasChildren ? submenu?.index === index : undefined}
            disabled={disabled}
            tabIndex={-1}
            sx={(theme) => ({
              mx: 0,
              '&:hover, &.Mui-focused, &.Mui-focusVisible': {
                backgroundColor: theme.palette.mode === "dark"
                  ? alpha(theme.palette.primary.main, 0.32)
                  : alpha(darken(theme.palette.primary.main, 0.12), 0.2),
              },
            })}
            onMouseEnter={() => {
              if (hasChildren && !disabled) openSubmenu(index, item.children!);
            }}
            onMouseLeave={(event) => {
              if (!hasChildren) return;
              const relatedTarget = event.relatedTarget as Node | null;
              if (relatedTarget && layerRef.current?.contains(relatedTarget)) return;
              closeSubmenuSoon();
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" && hasChildren && !disabled) {
                event.preventDefault();
                openSubmenu(index, item.children!, true);
                requestAnimationFrame(() => {
                  const menus = document.querySelectorAll<HTMLElement>(".context-menu");
                  menus[menus.length - 1]?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
                });
              } else if (event.key === "ArrowLeft" && depth > 0) {
                event.preventDefault();
                onClose();
              } else if (event.key === "Enter" && !disabled) {
                event.preventDefault();
                if (hasChildren) openSubmenu(index, item.children!, true);
                else {
                  item.action?.();
                  closeAll();
                }
              }
            }}
            onClick={() => {
              if (disabled) return;
              if (hasChildren) openSubmenu(index, item.children!, true);
              else {
                item.action?.();
                closeAll();
              }
            }}
          >
            <Box component="span" sx={{ display: "flex", alignItems: "center", width: "100%", minWidth: 0 }}>
              <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {item.label}
              </Box>
              {hasChildren && <ChevronRightIcon sx={{ ml: 1, width: 10, height: 10, color: "text.secondary", flexShrink: 0 }} />}
            </Box>
          </MenuItem>
        );
        })}
      </MenuList>
      {submenu && (
        <MenuLayer
          items={submenu.items}
          left={submenu.left}
          top={submenu.top}
          depth={depth + 1}
          onClose={() => setSubmenu(null)}
          closeAll={closeAll}
          onEnter={clearTimers}
        />
      )}
    </Box>
  );
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ open, x, y, items, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !document.querySelector(".context-menu")?.contains(target)) onClose();
    };
    const handleContextMenu = () => onClose();
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(<MenuLayer items={items} left={x} top={y} depth={0} onClose={onClose} closeAll={onClose} />, document.body);
};

export default ContextMenu;
