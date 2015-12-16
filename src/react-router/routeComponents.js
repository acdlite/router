const throwRenderError = () => {
  throw new Error(
    '<Route> elements are for router configuration only and should not ' +
    'be rendered'
  )
}

export { Route, IndexRoute } from 'react-router'
import { createRouteFromReactElement } from 'react-router/lib/RouteUtils'

export const Redirect = () => throwRenderError()

Redirect.createRouteFromReactElement = element => {
  const route = createRouteFromReactElement(element)
  route.path = route.from
  route.redirect = route.to
  return route
}
