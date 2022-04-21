const fs = require('fs');
const path = require('path');

const send = require('koa-send');
const R = require('ramda');

const inject = require('./inject');
const possibleExtensions = [ "", ".html", ".htm", ".xhtml", ".php", ".svg" ];

const createStatic = async (options, ctx, next) => {
  opts = Object.assign(Object.create(null), options);

  if (opts.index !== false) opts.index = opts.index || 'index.html';

  // try inject
  const x = path.extname(ctx.path).toLocaleLowerCase();
  if (possibleExtensions.indexOf(x) > -1) {
    const possiblePath = [
      path.join(opts.root, ctx.path),
      path.join(opts.root, ctx.path, opts.index),
    ].filter(p => fs.existsSync(p) && fs.statSync(p).isFile())[0];

    if (possiblePath){
      const contents = fs.readFileSync(possiblePath, "utf8");
      ctx.body = inject(contents);
      ctx.status = 200;
      return;
    }
  }

  // response
  let done = false
  if (ctx.method === 'HEAD' || ctx.method === 'GET') {
    try {
      done = await send(ctx, ctx.path, opts)
    } catch (err) {
      if (err.status !== 404) {
        throw err
      }
    }
  }

  if (!done) {
    await next()
  }
}
module.exports = R.curryN(2, createStatic);