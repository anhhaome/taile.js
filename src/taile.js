#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const crypto = require('crypto')

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chokidar = require('chokidar');
const WebSocket = require('faye-websocket');
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const postcssNested = require('postcss-nested');
const cssnano = require('cssnano');
const tailwindcss = require('tailwindcss');
const open = require('open');

require('colors');

const serveView = require('./view');
const createStatic = require('./static');

const WAIT = 100;

// commander
const rootArgv = (yargs) => yargs.positional('root', { describe: 'Path to view directory.' });

const commander = yargs(hideBin(process.argv));

commander.command('start <root>', 'start the server', rootArgv, 
  async (argv) => {
    // argv
    const root = path.join(process.cwd(), argv.root);
    const viewRoot = path.join(root, 'views');
    const publicRoot = path.join(root, 'public');

    const tailwindPath = path.join(root, 'tailwind.config.js');
    

    const config = require(tailwindPath);
    
    const cssInputPath = path.join(root, config.input || 'input.css');
    const cssOutputPath = path.join(root, config.output || './public/output.min.css');

    process.chdir(root);

    // css processor
    const buildCss = async () => {
      console.log(`[Css] Build css`.magenta);

      const css = fs.readFileSync(cssInputPath, 'utf8');

      const result = await postcss([tailwindcss(tailwindPath), autoprefixer, postcssNested, cssnano])
      .process(css, { from: config.input || './input.css', to: config.output || './public/output.min.css'});

      const dir = path.parse(cssOutputPath).dir;
      if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(cssOutputPath, result.css);
    }

    await buildCss();

    // server
    const Koa = require('koa');
    const app = new Koa();

    app.use(createStatic({ root: publicRoot }));
    app.use(serveView({ root: viewRoot, live: true }));

    const server = await app.listen(3001);
    const location = 'http://localhost:3001';
    console.log(`[Server] Server is running at: ${location}`.green);
    await open(location);

    // web socket
    let clients = [];
    server.addListener('upgrade', function(request, socket, head) {
      const ws = new WebSocket(request, socket, head);
      ws.onopen = function() { ws.send('connected'); };

      if (WAIT > 0) {
        (function() {
          const wssend = ws.send;
          let waitTimeout;
          ws.send = function() {
            const args = arguments;
            if (waitTimeout) clearTimeout(waitTimeout);
            waitTimeout = setTimeout(function(){
              wssend.apply(ws, args);
            }, WAIT);
          };
        })();
      }

      ws.onclose = function() {
        clients = clients.filter(function (x) {
          return x !== ws;
        });
      };

      clients.push(ws);
    });

    // watcher
    function handleChange(changePath) {
      console.log(`[Watcher] Changed: ${path.relative(root, changePath)}`.cyan);

      if (['.ejs', '.html'].indexOf(path.extname(changePath)) !== -1){
        return buildCss();
      }

      console.log(`[Watcher] Reload`.cyan);

      for (let ws of clients) {
        if (ws)
          ws.send('reload');
      };
    }

    const ignored = [
      function(testPath) { // Always ignore dotfiles (important e.g. because editor hidden temp files)
        return testPath !== "." && /(^[.#]|(?:__|~)$)/.test(path.basename(testPath));
      }
    ];

    const watcher = chokidar.watch(root, {
      ignored: ignored,
      ignoreInitial: true
    });

    watcher
      .on("change", handleChange)
      .on("add", handleChange)
      .on("unlink", handleChange)
      .on("addDir", handleChange)
      .on("unlinkDir", handleChange)
      .on("ready", function () {
        console.log("[Watcher] Ready for changes".cyan);
      })
      .on("error", function (err) {
        console.log("[Watcher] ERROR:".red, err);
      });
  }
);

commander.command('build <root>', 'build css for production', rootArgv, 
  async (argv) => {
    // argv
    const root = path.join(process.cwd(), argv.root);

    const tailwindPath = path.join(root, 'tailwind.config.js');
    

    const config = require(tailwindPath);
    
    const cssInputPath = path.join(root, config.input || 'input.css');
    const cssOutputPath = path.join(root, config.output || './public/output.min.css');

    process.chdir(root);

    // css processor
    const buildCss = async () => {
      console.log(`[Css] Build css`.magenta);

      const css = fs.readFileSync(cssInputPath, 'utf8');

      const result = await postcss([tailwindcss(tailwindPath), autoprefixer, postcssNested, cssnano])
      .process(css, { from: config.input || './input.css', to: config.output || './public/output.min.css'});

      const dir = path.parse(cssOutputPath).dir;
      if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
        
      fs.writeFileSync(cssOutputPath, result.css);
    }

    await buildCss();
  }
);

commander.parse();