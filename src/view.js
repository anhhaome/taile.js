const path = require('path');
const fs = require('fs');

const glob = require('glob');
const { match } = require('path-to-regexp');
const objectPath = require('object-path');
const ejs = require('ejs');
const moment = require('moment');
const { curry } = require('ramda');

const inject = require('./inject');

const parentResolveInclude = ejs.resolveInclude;
const render = async (storage, view, state) => {
  ejs.resolveInclude = function (name, filename, isDir) {
    const relativeFilename = path.relative(storage, path.join(path.dirname(filename), name));
    if (relativeFilename && relativeFilename.indexOf('..') === 0) { throw new Error('cannot include view outside storage'); }

    return parentResolveInclude(path.normalize(name), path.normalize(filename), isDir);
  };

  if (!path.extname(view)) { view += '.ejs'; }

  const viewPath = path.join(storage, view);
  if (!fs.existsSync(viewPath)) { return null; }

  const tpl = fs.readFileSync(viewPath, 'utf8');
  const fn = ejs.compile(tpl, {
    filename: viewPath,
    async: true,
    root: path.join(storage, 'views')
  });

  return fn(state);
};

const createViewState = (ctx, params) => {
  const state = Object.assign({}, {
    // request
    method: ctx.method,
    url: ctx.url,
    form: ctx.request.body || {},
    query: ctx.query,
    params: Object.assign({}, ctx.params, params),

    // response
    status: null,
    headers: {},

    // utils
    moment,
    dump: o => JSON.stringify(o, 0, 2)
  }, ctx.state);

  state.get = function (p) { return objectPath.get(this, p); };
  state.set = function (p, v) { return objectPath.set(this, p, v); };

  return state;
};

const exploreRoutes = root => {
  const raw = glob.sync('**/*.ejs', { cwd: root });

  const routes = raw.map(item => {
    const pp = path.parse(item);
    const rawViewPath = pp.name === 'index' ? path.join('/', pp.dir) : path.join('/', pp.dir, pp.name);
    const viewPath = rawViewPath.replace(/\/\_/g, '\/\:');

    return {
      method: 'all',
      path: viewPath,
      view: item
    };
  });

  return routes;
};

const matchRoute = (ctx, routes) => {
  const reqMethod = ctx.method.toLowerCase();
  const reqUrl = ctx.url;

  for (const route of routes) {
    if (route.method !== 'all' && route.method !== reqMethod) { continue; }

    const fn = match(route.path, { decode: decodeURIComponent });
    const rel = fn(reqUrl);

    if (!rel) { continue; }

    return {
      ...route,
      params: {
        ...rel.params
      }
    };
  }
};

const serveView = async ({ root, live }, ctx) => {
  const viewRoot = ctx.viewRoot || root;

  const routes = exploreRoutes(viewRoot);
  const route = matchRoute(ctx, routes);

  if (!route) {
    ctx.status = 404;
    ctx.body = 'Not found';
    return;
  }

  const state = createViewState(ctx, route.params);
  const body = await render(viewRoot, route.view, state);

  ctx.status = body ? 200 : 404;
  ctx.body = (live ? inject(body) : body) || 'Not found';
};

module.exports = curry(serveView);
