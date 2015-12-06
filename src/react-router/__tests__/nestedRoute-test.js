import React from 'react'
import { Route, IndexRoute } from 'react-router'
import { expect } from 'chai'
import { createRouter } from '@acdlite/router'
import { nestedRoute } from '@acdlite/router/react-router'

describe('nestedRoute()', () => {
  it('matches routes like React Router', done => {
    const router = createRouter(
      nestedRoute({
        id: 1,
        path: '/',
        childRoutes: [{
          id: 2,
          path: 'post',
          childRoutes: [{
            id: 3,
            path: ':id'
          }]
        }]
      })
    )

    router('/post/123', {
      done: (error, state) => {
        expect(state.routes.map(r => r.id)).to.eql([1, 2, 3])
        expect(state.params).to.eql({ id: '123' })
        done()
      }
    })
  })

  it('accepts JSX routes', done => {
    const router = createRouter(
      nestedRoute(
        <Route path="/" id={1}>
          <Route path="post" id={2}>
            <Route path=":id" id={3} />
          </Route>
        </Route>
      )
    )

    router('/post/123', {
      done: (error, state) => {
        expect(state.routes.map(r => r.id)).to.eql([1, 2, 3])
        expect(state.params).to.eql({ id: '123' })
        done()
      }
    })
  })

  it('handles partial matches', done => {
    const router = createRouter(
      nestedRoute(
        <Route path="/" id={1}>
          <Route path="post" id={2} />
          <Route path="post/:id" id={3} />
        </Route>
      )
    )

    router('/post/123', {
      done: (error, state) => {
        expect(state.routes.map(r => r.id)).to.eql([1, 3])
        expect(state.params).to.eql({ id: '123' })
        done()
      }
    })
  })

  it('matches from root if path begins with forward slash', done => {
    const router = createRouter(
      nestedRoute(
        <Route path="/" id={1}>
          <Route path="post" id={2}>
            <Route path="/post/:id" id={3} />
          </Route>
        </Route>
      )
    )

    router('/post/123', {
      done: (error, state) => {
        expect(state.routes.map(r => r.id)).to.eql([1, 2, 3])
        expect(state.params).to.eql({ id: '123' })
        done()
      }
    })
  })

  it('gets child routes asynchronously', done => {
    const router = createRouter(
      nestedRoute(
        <Route path="/" id={1}>
          <Route path="post" id={2} getChildRoutes={(state, cb) => cb(null, [
            <Route path="/post/:id" id={3} />
          ])}/>
        </Route>
      )
    )

    router('/post/123', {
      done: (error, state) => {
        expect(state.routes.map(r => r.id)).to.eql([1, 2, 3])
        expect(state.params).to.eql({ id: '123' })
        done()
      }
    })
  })

  it('partially matches routes with no path', done => {
    const router = createRouter(
      nestedRoute(
        <Route path="/" id={1}>
          <Route path="post" id={2}>
            <Route id={3}>
              <Route path=":id" id={4} />
            </Route>
          </Route>
        </Route>
      )
    )

    router('/post/123', {
      done: (error, state) => {
        expect(state.routes.map(r => r.id)).to.eql([1, 2, 3, 4])
        expect(state.params).to.eql({ id: '123' })
        done()
      }
    })
  })

  it('works with index routes', done => {
    const router = createRouter(
      nestedRoute(
        <Route path="/" id={1}>
          <Route path="post/:id" id={2}>
            <IndexRoute id={3} />
          </Route>
        </Route>
      )
    )

    router('/post/123', {
      done: (error, state) => {
        expect(state.routes.map(r => r.id)).to.eql([1, 2, 3])
        expect(state.params).to.eql({ id: '123' })
        done()
      }
    })
  })
})
