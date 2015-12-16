import compose from 'lodash/function/compose'
import flatten from 'lodash/array/flatten'
import * as PatternUtils from 'react-router/lib/PatternUtils'
import { createRoutes } from 'react-router/lib/RouteUtils'
import { handle, done, redirect } from '../core'

/**
 * Build a params object given arrays of names and values.
 * Adapted from React Router's private `assignParams()`.
 * https://github.com/rackt/react-router/blob/master/modules/matchRoutes.js#L47
 * @private
 */
const buildParams = (paramNames, paramValues) =>
  paramNames.reduce((result, paramName, index) => {
    const paramValue = paramValues && paramValues[index]

    if (Array.isArray(result[paramName])) {
      result[paramName].push(paramValue)
    } else if (paramName in result) {
      result[paramName] = [ result[paramName], paramValue ]
    } else {
      result[paramName] = paramValue
    }

    return result
  }, {})

const runChildRoutes = config => handle({
  next: next => (error, state) => {
    if (config.childRoutes) {
      /* eslint-disable */
      return compose(...config.childRoutes.map(nestedRoute))(next)(null, state)
      /* eslint-enable */
    } else if (config.getChildRoutes) {
      config.getChildRoutes(state, (e, childRoutes) => {
        if (e) return next(e, state)
        /* eslint-disable */
        return compose(nestedRoute(...childRoutes))(next)(null, state)
        /* eslint-enable */
      })
    }

    return next(error, state)
  }
})

const getRoutePattern = (routes, routeIndex) => {
  let parentPattern = ''

  for (let i = routeIndex; i >= 0; i--) {
    const route = routes[i]
    const pattern = route.path || ''

    parentPattern = pattern.replace(/\/*$/, '/') + parentPattern

    if (pattern.indexOf('/') === 0) break
  }

  return '/' + parentPattern
}

const exitBranch = config => handle({
  next: next => (error, state) => {
    const { stack, didFullyMatch, ...rest } = state

    // If there was no full match, clean up state and continue
    if (!didFullyMatch) {
      const newState = { ...rest }

      if (stack.length > 1) {
        newState.stack = stack.slice(0)
        // Pop last item off the stack
        newState.stack.pop()
      }

      return next(error, newState)
    }

    const routes = stack.map(s => s.route)
    const params = buildParams(
      flatten(stack.map(s => s.paramNames)),
      flatten(stack.map(s => s.paramValues))
    )

    if (config.redirect) {
      const redirectTo = config.redirect
      let pathname
      if (redirectTo.charAt(0) === '/') {
        pathname = PatternUtils.formatPattern(redirectTo, params)
      } else if (!redirectTo) {
        pathname = state.pathname
      } else {
        const routeIndex = routes.indexOf(config)
        const parentPattern = getRoutePattern(routes, routeIndex - 1)
        const pattern = parentPattern.replace(/\/*$/, '/') + redirectTo
        pathname = PatternUtils.formatPattern(pattern, params)
      }

      return redirect(pathname)(next)(error, state)
    }

    const newState = {
      ...rest,
      routes,
      params
    }

    // Mark state as done and continue
    return done(next)(null, newState)
  }
})

const nestedRoute = (..._configs) => {
  // Convert JSX routes to object routes (or do nothing if already an object)
  const configs = createRoutes(_configs)

  const routeMiddlewares = configs.map(config => handle({
    next: next => (error, state) => {
      // Stack of parent routes, which partially (but not fully) matched the path
      // If this is the top-most route, create an empty array
      const stack = state.stack || []

      // The route's path will be matched against either the full path or the
      // remaining pathname as determined by the parent route. Use the full
      // path if there is no parent route, or if the path begins with a slash
      const isRootPath = (config.path && config.path.charAt(0) === '/')
      const pathnameToMatch = (!stack.length || isRootPath)
        ? state.pathname
        : stack[stack.length - 1].remainingPathname

      const { remainingPathname, paramNames, paramValues } = config.path
        ? PatternUtils.matchPattern(config.path, pathnameToMatch)
        // Treat a route without a path as a partial match
        : {
          remainingPathname: pathnameToMatch,
          paramNames: [],
          paramValues: []
        }

      // If pattern does not match, continue
      if (!paramValues) return next(null, state)

      // If there is no remaining pathname, this route fully matched
      const didFullyMatch = remainingPathname === ''

      // Pattern matched at least partially, so create new state object
      const newState = {
        ...state,
        stack: [...stack, {
          remainingPathname,
          // Param names and values will be zipped together at the end
          paramNames,
          paramValues,
          // Store route config on stack
          route: config
        }],
        didFullyMatch
      }

      if (didFullyMatch && config.indexRoute) {
        newState.stack.push({
          remainingPathname: '',
          paramNames: [],
          paramValues: [],
          route: config.indexRoute
        })
      }

      // Array of middlewares to run before continuing
      const middlewares = [runChildRoutes(config)]

      // Clean up state before exiting route branch
      middlewares.push(exitBranch(config))

      return compose(...middlewares)(next)(null, newState)
    }
  }))

  return compose(...routeMiddlewares)
}

export default nestedRoute
