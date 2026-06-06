# AUR / yay Setup Guide — actone-bin

## Prerequisites

- Arch Linux (or Arch-based distro)
- `base-devel` group installed
- AUR account at https://aur.archlinux.org
- SSH public key added to your AUR account (Account → SSH Public Key)

---

## Step 1: Create the AUR package (one-time)

1. Go to https://aur.archlinux.org → Log in
2. Click **Submit Packages**
3. Package name: `actone-bin`
4. Confirm creation

Your AUR repo URL: `ssh://aur@aur.archlinux.org/actone-bin.git`

---

## Step 2: First push to AUR (one-time)

```bash
# Clone empty AUR repo
git clone ssh://aur@aur.archlinux.org/actone-bin.git /tmp/actone-aur
cd /tmp/actone-aur

# Copy PKGBUILD from this repo
cp /path/to/ActOne/packaging/aur/PKGBUILD .

# Update checksums
updpkgsums

# Generate .SRCINFO (required by AUR)
makepkg --printsrcinfo > .SRCINFO

# Commit and push
git add PKGBUILD .SRCINFO
git commit -m "Initial package: actone-bin v0.1.0"
git push origin master
```

---

## Step 3: Publish updates (every new release)

From the ActOne repo root:

```bash
./scripts/publish_aur.sh 0.1.0
```

The script:

1. Copies PKGBUILD to temp dir
2. Updates `pkgver` and `pkgrel`
3. Downloads source tarball and updates checksums via `updpkgsums`
4. Generates `.SRCINFO` via `makepkg --printsrcinfo`
5. Clones AUR repo, copies PKGBUILD + .SRCINFO
6. Commits and pushes

---

## Step 4: Users install via yay

```bash
yay -S actone-bin
```

Or with paru:

```bash
paru -S actone-bin
```

The PKGBUILD downloads `ActOne-Linux-x64.tar.gz` from the GitHub release and installs:

- `/usr/bin/actone` — the binary
- `/usr/share/applications/actone.desktop` — desktop entry
- `/usr/share/icons/hicolor/256x256/apps/actone.png` — app icon

---

## Script reference

| File | Purpose |
|---|---|
| `packaging/aur/PKGBUILD` | AUR package definition |
| `scripts/publish_aur.sh` | One-command publish script |
| `assets/linux/actone.desktop` | Desktop entry file |
| `src-tauri/icons/icon.png` | App icon (used in PKGBUILD) |
