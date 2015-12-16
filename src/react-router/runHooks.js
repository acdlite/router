import compose from 'lodash/function/compose'
import { handle } from '../core'

export const runHooks = hookName => handle({
  done: next => (error, state) => {
    if (!state.routes) return next(null, state)
    const hooks = state.routes.map(r => r[hookName]).filter(Boolean)
    return compose(...hooks)(next)(error, state)
  }
})

export const runEnterHooks = runHooks('onEnter')
