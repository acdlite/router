import { expect } from 'chai'
import React from 'react'
import { Route } from 'react-router'
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

  it('attaches router object to components', done => {
    const A = () => {}
    const B = () => {}
    const C = () => {}

    const router = createRouter(
      nestedRoute(
        <Route path="/" id={1} component={A}>
          <Route path="post" id={2} component={B}>
            <Route path=":id" id={3} component={C} />
          </Route>
        </Route>
      ),
      getComponents
    )

    router('/post/123', {
      done: (error, state) => {
        expect(state.components.map(c => c.route.id)).to.eql([1, 2, 3])
        done()
      }
    })
  })
})
