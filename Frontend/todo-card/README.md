# Todo Card

A React + Vite Todo Card interface with task details, status badge, tags, due time display, and completion interactions.

## What You Have Implemented

- Built a reusable `TodoCard` component with:
- Priority badge (`High`, `Medium`, `Low`)
- Status badge (`In Progress`, `Todo`, `Done`)
- Task title, description, and tags
- Edit and delete action buttons
- Completion checkbox
- Native Date display using JavaScript `Date` output (no custom formatting library)
- Applied completion behavior:
- When checked, task description is struck through
- Status badge styling remains tied to the task status value (does not auto-switch to done)
- Improved layout:
- Card is centered on screen
- Refined card and badge styling in `App.css` and `index.css`

## Tech Stack

- React 19
- Vite 8
- ESLint 9
- pnpm

## Run Locally

1. Install dependencies:

```bash
pnpm install
```

2. Start development server:

```bash
pnpm dev
```

3. Build for production:

```bash
pnpm build
```

4. Preview production build:

```bash
pnpm preview
```

## GitHub Pages Deployment

This project includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

### How it works

- Installs dependencies with `pnpm`
- Builds with Vite
- Sets `--base=/<repo-name>/` automatically during CI build
- Uploads build artifacts
- Deploys to GitHub Pages

### One-time GitHub setup

1. Push this project to GitHub.
2. In your repository, go to `Settings > Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to `main` (or run workflow manually) to deploy.

## Project Structure

```text
todo-card/
	src/
		components/
			TodoCard.jsx
		App.jsx
		App.css
		index.css
	.github/
		workflows/
			deploy.yml
```
