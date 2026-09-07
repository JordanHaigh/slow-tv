# GitHub connection guide

This project is hosted in the GitHub repository:

```text
git@github.com:JordanHaigh/slow-tv.git
```

The GitHub remote is named `origin`.

## Check the current connection

From the project directory, run:

```bash
git remote -v
```

You should see:

```text
origin  git@github.com:JordanHaigh/slow-tv.git (fetch)
origin  git@github.com:JordanHaigh/slow-tv.git (push)
```

## Connect an existing checkout

If this folder is already a Git repository but has no remote:

```bash
git remote add origin git@github.com:JordanHaigh/slow-tv.git
git remote -v
```

If `origin` exists but points somewhere else:

```bash
git remote set-url origin git@github.com:JordanHaigh/slow-tv.git
git remote -v
```

## Set up a new computer

Clone the repository, install dependencies, and start the app:

```bash
git clone git@github.com:JordanHaigh/slow-tv.git
cd slow-tv
npm install
npm run dev
```

## GitHub authentication with SSH

Test whether this computer can authenticate with GitHub:

```bash
ssh -T git@github.com
```

If authentication fails, create an SSH key, add the public key to GitHub under **Settings → SSH and GPG keys**, and try again:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
```

Never share the private key file (`~/.ssh/id_ed25519`). Only the `.pub` file should be added to GitHub.

## Push changes

Check what changed, then commit and push:

```bash
git status
git add .
git commit -m "Describe the change"
git push -u origin main
```

The `-u` option connects the local `main` branch to GitHub. After the first push, this is enough:

```bash
git push
```

## Pull changes before starting work

```bash
git pull --rebase origin main
```

If Git reports conflicts, resolve the marked files, then run:

```bash
git add .
git rebase --continue
git push
```

## Files that should stay local

Do not commit personal media, credentials, or generated dependencies. The repository already ignores common local and generated files, including:

- `node_modules/`
- `.env*`
- `dist/`
- `.wrangler/`
- `.next/`
- local media files selected through the browser

Slow TV reads selected media locally in the browser; media files are not uploaded to GitHub by the app.
