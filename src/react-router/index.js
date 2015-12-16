import compose from 'lodash/function/compose'
import getComponents from './getComponents'
import nestedRoute from './nestedRoute'
import { runHooks, runEnterHooks } from './runHooks'

export { Route, IndexRoute, Redirect } from './routeComponents'

export {
  getComponents,
  nestedRoute,
  runHooks,
  runEnterHooks
}

export const reactRoutes = (...configs) => compose(
  nestedRoute(...configs),
  runEnterHooks,
  getComponents
)
