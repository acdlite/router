import { handle } from '../core'

// Private value that represents the lack of a user-specified component
// for a route. Different than null, because a user may specify null.
const SKIP = {}

const getComponents = handle({
  done: next => (error, state) => {
    if (error) return next(error)

    const { routes } = state

    if (!routes) return next(error, state)

    const result = []

    // Keep count of components yet to be received
    let remaining = routes.length

    // Use to prevent calling next multiple times, which could happen if
    // multiple `route.getComponent()` calls result in errors
    let didCallNext = false

    const receiveComponent = (component, index) => {
      component.route = routes[index]
      result[index] = component
      if (--remaining === 0) {
        next(null, {
          ...state,
          // Skip routes that don't have `component` or `getComponent()`
          components: result.filter(c => c !== SKIP)
        })
      }
    }

    const receiveError = err => {
      if (didCallNext) return

      didCallNext = true
      next(err)
    }

    routes.forEach((route, i) => {
      if (route.component) {
        return receiveComponent(route.component, i)
      }

      if (route.getComponent) {
        return route.getComponent(state, (err, component) => {
          if (err) return receiveError(err)
          receiveComponent(component, i)
        })
      }

      receiveComponent(SKIP)
    })
  }
})

export default getComponents
