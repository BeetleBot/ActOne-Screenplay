import React, { useState, useRef, useEffect } from 'react';
import { useScreenplay } from '../context/ScreenplayContext';

type MenuItem = {
  label?: string;
  action?: () => void;
  shortcut?: string;
  divider?: boolean;
  submenu?: MenuItem[];
};

type Menu = {
  label: string;
  items: MenuItem[];
};

interface MenuBarProps {
  onExportPDF?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ onExportPDF }) => {
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const { openFile, saveFile, autoAddSceneNumbers, clearSceneNumbers } = useScreenplay();

  const handleClose = () => {
    try {
      (window as any).__TAURI_INTERNALS__?.invoke('plugin:window|close');
    } catch (e) {}
  };

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N' },
        { label: 'Open...', action: openFile, shortcut: 'Ctrl+O' },
        { label: 'Open Recent >' },
        { divider: true },
        { label: 'Save', action: saveFile, shortcut: 'Ctrl+S' },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
        { divider: true },
        {
          label: 'Export',
          submenu: [
            { label: 'PDF...', action: onExportPDF, shortcut: 'Ctrl+P' },
            { label: 'Final Draft...' },
            { label: 'Fountain...' },
          ]
        },
        { divider: true },
        { label: 'Close', shortcut: 'Ctrl+W' },
        { label: 'Quit', shortcut: 'Ctrl+Q', action: handleClose },
      ]
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z' },
        { divider: true },
        { label: 'Cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', shortcut: 'Ctrl+V' },
        { divider: true },
        { label: 'Select All', shortcut: 'Ctrl+A' },
        { divider: true },
        { label: 'Find / Replace...', shortcut: 'Ctrl+F' },
      ]
    },
    {
      label: 'Format',
      items: [
        { label: 'Scene Heading', shortcut: 'Ctrl+1' },
        { label: 'Action', shortcut: 'Ctrl+2' },
        { label: 'Character', shortcut: 'Ctrl+3' },
        { label: 'Dialogue', shortcut: 'Ctrl+4' },
        { label: 'Parenthetical', shortcut: 'Ctrl+5' },
        { label: 'Transition', shortcut: 'Ctrl+6' },
        { divider: true },
        { label: 'Bold', shortcut: 'Ctrl+B' },
        { label: 'Italic', shortcut: 'Ctrl+I' },
        { label: 'Underline', shortcut: 'Ctrl+U' },
        { divider: true },
        {
          label: 'Scene Numbers',
          submenu: [
            {
              label: 'Reset',
              action: () => {
                if (window.confirm("All your scene numbers will be gone and this cannot be undone.")) {
                  clearSceneNumbers();
                }
              }
            },
            {
              label: 'Renumber',
              action: () => {
                if (window.confirm("This will add numbers to all your scene numbers. The old scene numbers will be deleted and will be replaced by new one.")) {
                  autoAddSceneNumbers();
                }
              }
            }
          ]
        }
      ]
    },
    {
      label: 'View',
      items: [
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+\\' },
        { label: 'Toggle Theme' },
        { divider: true },
        { label: 'Zoom In', shortcut: 'Ctrl++' },
        { label: 'Zoom Out', shortcut: 'Ctrl+-' },
        { label: 'Actual Size', shortcut: 'Ctrl+0' },
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts' },
        { label: 'About Drafter' },
      ]
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setActiveSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="menu-bar" ref={menuBarRef} data-tauri-drag-region>
      {menus.map((menu, index) => (
        <div 
          key={menu.label} 
          className={`menu-button ${activeMenu === index ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === index ? null : index)}
          onMouseEnter={() => {
            if (activeMenu !== null) setActiveMenu(index);
          }}
        >
          {menu.label}
          {activeMenu === index && (
            <div className="menu-dropdown">
              {menu.items.map((item, i) => item.divider ? (
                <div key={`div-${i}`} className="menu-divider" />
              ) : item.submenu ? (
                <div
                  key={item.label}
                  className="menu-item has-submenu"
                  onMouseEnter={() => setActiveSubmenu(item.label!)}
                  onMouseLeave={() => setActiveSubmenu(null)}
                >
                  <span className="menu-item-label">{item.label}</span>
                  <span className="menu-item-arrow">›</span>
                  {activeSubmenu === item.label && (
                    <div className="menu-submenu">
                      {item.submenu.map((sub) => (
                        <div
                          key={sub.label}
                          className="menu-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (sub.action) sub.action();
                            setActiveMenu(null);
                            setActiveSubmenu(null);
                          }}
                        >
                          <span className="menu-item-label">{sub.label}</span>
                          {sub.shortcut && <span className="menu-item-shortcut">{sub.shortcut}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  key={item.label} 
                  className="menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.action) item.action();
                    setActiveMenu(null);
                  }}
                >
                  <span className="menu-item-label">{item.label}</span>
                  {item.shortcut && <span className="menu-item-shortcut">{item.shortcut}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
