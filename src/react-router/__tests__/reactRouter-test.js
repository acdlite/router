import { expect } from 'chai'
import createMemoryHistory from 'history/lib/createMemoryHistory'
import useQueries from 'history/lib/useQueries'
import { createRouter, ensureMostRecent } from '@acdlite/router'
import { nestedRoute, getComponents } from '@acdlite/router/react-router'

const createHistory = useQueries(createMemoryHistory)

const delay = (time = 0) => new Promise(res => setTimeout(res, time))

describe('Mimic React Router API', () => {
  it('works', async () => {
    const history = createHistory()

    const App = () => {}
    const PostIndex = () => {}
    const Post = () => {}

    const routeConfig = {
      path: '/',
      component: App,
      childRoutes: [{
        path: 'post',
        indexRoute: {
          component: PostIndex
        },
        childRoutes: [{
          path: ':id',
          getComponent: (state, callback) =>
            setImmediate(() => callback(null, Post))
        }]
      }]
    }

    const router =
      createRouter(
        ensureMostRecent(
          nestedRoute(routeConfig),
          getComponents
        )
      )

    let state
    history.listen(location => {
      router(location.pathname + location.search + location.hash, {
        done: (error, s) => {
          state = s
        }
      })
    })


    history.push('/post/123?foo=bar')
    await delay() // One of the components was fetched async
    expect(state.components).to.eql([App, Post])

    history.push('/post')
    expect(state.components).to.eql([App, PostIndex])
  })
})
