import compose from 'lodash/function/compose'
import mapValues from 'lodash/object/mapValues'
import isFunction from 'lodash/lang/isFunction'
import isUndefined from 'lodash/lang/isUndefined'

const identity = t => t
const noop = () => {}

export const handle = handlers => next => (error, state) => {
  let handler = identity

  if (error) {
    if (handlers.error) handler = handlers.error
  } else if (state.redirect) {
    if (handlers.redirect) handler = handlers.redirect
  } else if (state.done) {
    if (handlers.done) handler = handlers.done
  } else {
    if (handlers.next) handler = handlers.next
  }

  handler(next)(error, state)
}

export const listen = listeners => () =>
  isFunction(listeners)
    ? listeners
    : handle(mapValues(listeners, listener => () => listener))(noop)

export const ensureMostRecent = (...middlewares) => {
  const middleware = compose(...middlewares)
  let mostRecentPath
  return next => (error, state) => {
    if (error) return next(error, state)
    mostRecentPath = state.path
    middleware((error2, state2) => {
      if (state2.path && state2.path === mostRecentPath) {
        return next(error2, state2)
      }
    })(error, state)
  }
}

const _parsePath = path => {
  let pathname = path
  let search = ''
  let hash = ''

  const hashIndex = pathname.indexOf('#')
  if (hashIndex !== -1) {
    hash = pathname.substring(hashIndex)
    pathname = pathname.substring(0, hashIndex)
  }

  const searchIndex = pathname.indexOf('?')
  if (searchIndex !== -1) {
    search = pathname.substring(searchIndex)
    pathname = pathname.substring(0, searchIndex)
  }

  if (pathname === '') {
    pathname = '/'
  }

  return { pathname, search, hash }
}

export const parsePath = handle({
  next: next => (error, state) => {
    if (state.path) {
      return next(null, {
        ...state,
        ..._parsePath(state.path)
      })
    }

    if (
      !isUndefined(state.pathname) &&
      !isUndefined(state.search) &&
      !isUndefined(state.hash)
    ) {
      return next(null, {
        ...state,
        path: state.pathname + state.search + state.hash
      })
    }

    return next(new Error(
      'State object must have either `path` or `pathname`, `search`, ' +
      'and `hash`'
    ))
  }
})

export const createRouter = (...middlewares) => (path, listeners = noop) => {
  const initialState = typeof path === 'string' ? { path } : path
  return compose(
    parsePath,
    ...middlewares,
    listen(listeners)
  )(noop)(null, initialState)
}

const redirectMiddleware = path =>
  next => (error, state) => next(null, { ...state, redirect: path })

export const redirect = path => handle({
  done: redirectMiddleware(path),
  next: redirectMiddleware(path)
})

export const done = handle({
  next: next => (error, state) => next(null, { ...state, done: true })
})

export const mapState = func => handle({
  next: next => (error, state) => next(null, func(state))
})
