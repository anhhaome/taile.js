# Taile.js

Quick Tailwind CSS and EJS view engine page design.

## Install

Clone this repository, and run:

```bash
npm install -g
```

Or you can use it locally:

```bash
npm install
npm run tailejs -- <command>
```

## Usage

Start with live server:

```bash
tailejs start <viewPath>
```

Build css for production:

```bash
tailejs build <viewPath>
```

## Route

### File system routing

- `/index.ejs` -> `/`
- `/abc/def.ejs` -> `/abc/def`
- `/_foo/_bar.ejs` -> `/:foo/:bar`
- `/_id.html.ejs` -> `/:id.html`

## License

MIT