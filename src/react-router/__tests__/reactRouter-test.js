import { expect } from 'chai'
import React from 'react'
import createMemoryHistory from 'history/lib/createMemoryHistory'
import useQueries from 'history/lib/useQueries'
import { createRouter, redirect } from '@acdlite/router'
import { reactRoutes, Route, Redirect } from '@acdlite/router/react-router'

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
        reactRoutes(routeConfig)
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
      reactRoutes(
        <Route path="/" id={1} component={A}>
          <Route path="post" id={2} component={B}>
            <Route path=":id" id={3} component={C} />
          </Route>
        </Route>
      )
    )

    router('/post/123', {
      done: (error, state) => {
        expect(state.components.map(c => c.route.id)).to.eql([1, 2, 3])
        done()
      }
    })
  })

  it('runs enter hooks', done => {
    const onEnter = redirect('/new/path')
    const router = createRouter(
      reactRoutes(
        <Route path="/" id={1}>
          <Route path="post" id={2} onEnter={onEnter}>
            <Route path=":id" id={3} />
          </Route>
        </Route>
      )
    )

    router('/post/123', {
      redirect: (error, state) => {
        expect(state.redirect).to.equal('/new/path')
        done()
      }
    })
  })

  it('works with redirects', done => {
    const router = createRouter(
      reactRoutes(
        <Route path="/" id={1}>
          <Route path="post" id={2}>
            <Redirect from=":id" to="foo/:id/bar" id={3} />
          </Route>
        </Route>
      )
    )

    router('/post/123', {
      redirect: (error, state) => {
        expect(state.redirect).to.equal('/post/foo/123/bar')
        done()
      }
    })
  })
})
