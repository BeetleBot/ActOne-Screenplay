========================================================================
                     ACTONE - Linux Installation Guide
                                  iyal.ink
========================================================================

Thank you for downloading ActOne Screenplay!
Website: https://actone.iyal.ink
Publisher: iyal.ink

------------------------------------------------------------------------
System Prerequisites
------------------------------------------------------------------------
ActOne requires standard webkit and GTK dependencies. If missing on your system:

- Ubuntu/Debian/Pop!_OS:
      sudo apt-get update && sudo apt-get install -y libwebkit2gtk-4.1-0 libgtk-3-0

- Fedora/RHEL:
      sudo dnf install webkit2gtk4.1 gtk3

- Arch Linux:
      sudo pacman -S webkit2gtk-4.1 gtk3

------------------------------------------------------------------------
Installation Instructions
------------------------------------------------------------------------
1. Open your terminal in the extracted directory.
2. Run the installer:

       sudo ./install.sh

   This will:
   - Copy binaries to /usr/share/actone
   - Symlink the executable to /usr/bin/actone
   - Register file associations (.fountain, .actone, .actheme)
   - Install desktop shortcuts and application icons

3. Launch ActOne from your application menu or by typing:

       actone

To uninstall in the future, run:

       sudo ./uninstall.sh

------------------------------------------------------------------------
Support & Feedback
------------------------------------------------------------------------
- Official Website: https://actone.iyal.ink
- Powered by iyal.ink (https://iyal.ink)

========================================================================
