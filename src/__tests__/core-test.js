import { expect } from 'chai'
import {
  createRouter,
  handle,
  listen,
  ensureMostRecent,
  redirect,
  done,
  mapState
} from '@acdlite/router'

describe('Core', () => {
  describe('createRouter()', () => {
    it('creates a router from middleware', _done => {
      const middleware = next => (error, state) => next(null, {
        ...state,
        some: 'field'
      })
      const router = createRouter(middleware)
      router('/some/path?query#hash', (error, state) => {
        expect(state.path).to.equal('/some/path?query#hash')
        expect(state.pathname).to.equal('/some/path')
        expect(state.hash).to.equal('#hash')
        expect(state.some).to.equal('field')
        _done()
      })
    })

    it('can accept a state object', _done => {
      const middleware = next => (error, state) => next(null, {
        ...state,
        some: 'field'
      })
      const router = createRouter(middleware)
      router('/some/path', (error, state) => {
        expect(state.path).to.equal('/some/path')
        expect(state.some).to.equal('field')
        _done()
      })
    })

    it('if given path, adds pathname, search, and hash', _done => {
      const router = createRouter(t => t)
      router({ path: '/some/path?query#hash' }, (error, state) => {
        expect(state.path).to.equal('/some/path?query#hash')
        expect(state.pathname).to.equal('/some/path')
        expect(state.search).to.equal('?query')
        expect(state.hash).to.equal('#hash')
        _done()
      })
    })

    it('if given pathname, search, and hash, adds path', _done => {
      const router = createRouter(t => t)
      router({
        pathname: '/some/path',
        search: '?query',
        hash: '#hash'
      }, (error, state) => {
        expect(state.path).to.equal('/some/path?query#hash')
        expect(state.pathname).to.equal('/some/path')
        expect(state.search).to.equal('?query')
        expect(state.hash).to.equal('#hash')
        _done()
      })
    })
  })

  describe('handle()', () => {
    it('handles errors', () => {
      const middleware = handle({
        error: next => (err, state) =>
          next(null, {
            ...state,
            foo: 'bar'
          })
      })

      let state

      middleware(
        (error, s) => state = s
      )(new Error(), { some: 'field' })
      expect(state).to.eql({ some: 'field', foo: 'bar' })

      middleware(
        (error, s) => state = s
      )(null, { some: 'field' })
      expect(state).to.eql({ some: 'field' })
    })

    it('handles redirects', () => {
      const middleware = handle({
        redirect: next => (err, state) => {
          const { redirect: _redirect, ...rest } = state
          next(null, {
            ...rest,
            foo: 'bar'
          })
        }
      })

      let state

      middleware(
        (error, s) => state = s
      )(null, { redirect: '/new/path', some: 'field' })
      expect(state).to.eql({ some: 'field', foo: 'bar' })

      middleware(
        (error, s) => state = s
      )(null, { some: 'field' })
      expect(state).to.eql({ some: 'field' })
    })

    it('handles completed states', () => {
      const middleware = handle({
        done: next => (err, state) => {
          const { done: _done, ...rest } = state
          next(null, {
            ...rest,
            foo: 'bar'
          })
        }
      })

      let state

      middleware(
        (error, s) => state = s
      )(null, { done: true, some: 'field' })
      expect(state).to.eql({ some: 'field', foo: 'bar' })

      middleware(
        (error, s) => state = s
      )(null, { some: 'field' })
      expect(state).to.eql({ some: 'field' })
    })

    it('handles incomplete states', () => {
      const middleware = handle({
        next: next => (err, state) =>
          next(null, {
            ...state,
            foo: 'bar'
          })
      })

      let state

      middleware(
        (error, s) => state = s
      )(null, { some: 'field' })
      expect(state).to.eql({ some: 'field', foo: 'bar' })

      middleware(
        (error, s) => state = s
      )(null, { done: true, some: 'field' })
      expect(state).to.eql({ done: true, some: 'field' })
    })
  })

  describe('listen()', () => {
    it('works like handle(), but for listeners instead of middleware', () => {
      let state
      const middleware = listen({
        next: (error, s) => state = s
      })

      middleware()(null, { foo: 'bar' })
      expect(state).to.eql({
        foo: 'bar'
      })
    })

    it('does nothing if no listeners match', () => {
      let state
      const middleware = listen({})

      middleware()(null, { foo: 'bar' })
      expect(state).to.be.undefined
    })

    it('accepts a single listener as well', () => {
      let error
      let state
      const middleware = listen(
        (e, s) => {
          error = e
          state = s
        }
      )

      middleware()(null, { foo: 'bar' })
      expect(state).to.eql({ foo: 'bar' })
      expect(error).to.be.null

      const e = new Error()
      middleware()(e, { foo: 'bar' })
      expect(state).to.eql({ foo: 'bar' })
      expect(error).to.equal(e)
    })
  })

  describe('ensureMostRecent()', () => {
    it('wraps middleware and continues only if path matches most recent path', _done => {
      const spy1 = sinon.spy()
      const spy2 = sinon.spy()

      const router = createRouter(
        ensureMostRecent(
          next => (error, state) => {
            if (state.path === '/1') {
              return setImmediate(() => next(error, state))
            }
            next(error, state)
          }
        )
      )

      router('/1', (error, state) => spy1(state))
      router('/2', (error, state) => spy2(state))

      setTimeout(() => {
        expect(spy1.callCount).to.equal(0)
        expect(spy2.callCount).to.equal(1)
        expect(spy2.args[0][0].path).to.eql('/2')
        _done()
      })
    })
  })

  describe('redirect()', () => {
    it('marks state as redirect', () => {
      let state
      const middleware = redirect('/new/path')

      middleware(
        (error, s) => state = s
      )(null, { path: '/some/path', foo: 'bar' })
      expect(state).to.eql({
        path: '/some/path',
        redirect: '/new/path',
        foo: 'bar'
      })
    })
  })

  describe('done()', () => {
    it('marks state as done', () => {
      let state
      const middleware = done

      middleware(
        (error, s) => state = s
      )(null, { path: '/some/path', foo: 'bar' })
      expect(state).to.eql({
        path: '/some/path',
        done: true,
        foo: 'bar'
      })
    })
  })

  describe('mapState()', () => {
    it('creates a middleware that synchronously maps a state object', () => {
      let state
      const middleware = mapState(s => ({ ...s, extra: 'field' }))
      middleware(
        (error, s) => state = s
      )(null, { path: '/some/path' })
      expect(state).to.eql({
        path: '/some/path',
        extra: 'field'
      })
    })
  })
})
