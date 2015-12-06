# Router

An experiment in functional routing for JavaScript applications.

```
npm install --save @acdlite/router
```

The name is intentionally generic because it's still in the experimental phase (perhaps forever).

Key features:

- A router is defined using composable middleware functions.
- A router is a function that turns a path into a state object. That's it. This allows for total separation of history management from route matching.
- Because history management is separate, the server-side API is identical to the client-side API.

**See below for a proof-of-concept that mimics the React Router API.**

## Should I use this?

No.

Well, maybe. I'm currently using this in a side project, but I wouldn't recommend it for any production apps.

## How it works

A "router" in the context of this project is a function that accepts a path and a callback. The router turns the path into a state object by passing it through a series of middleware. Once the middleware completes, the callback is called (either synchronously or asynchronously) with the final state object, which can be used to render an app.

History management is considered a separate concern — just pass the router a string. On the client, use a project like [history](https://github.com/rackt/history). On the server, use your favorite web framework like [Express](http://expressjs.com/en/index.html) or [Koa](https://github.com/koajs/koa).

```js
const router = createRouter(...middlewares)

router('/some/path', (error, state) => {
  // Render app using state
})
```

### Middleware

A middleware is a function that accepts Node-style callback (we'll call it a listener) and returns a new Node-style callback with augmented behavior.

```js
type Listener = (error: Error, state: Object) => void
type Middleware = (next: Listener) => Listener
```

An important feature of middleware is that they are composable:

```js
// Middlewares 1, 2, and 3 will run in sequence from left to right
const combinedMiddleware = compose(middleware1, middleware2, middlware3)
```

Router middleware is much like middleware in Redux. It is used to augment a state object as it passes through a router. Here's an example of a middleware that adds a `query` field:

```js
import queryString from 'query-string'

const parseQuery = next => (error, state) => {
  if (error) return next(error)

  next(null, {
    ...state,
    query: queryString.parse(state.search)
  })
}
```

As with React props and Redux state, we treat router state as immutable.

### State object conventions

All state objects should have the fields `path`, `pathname`, `search`, and `hash`. When you pass a path string to a router function, the remaining fields are extracted from the path. The reverse also works: if instead of a path string you pass an initial state object to a router function with `pathname`, `search`, and `hash`, a `path` field is added. This allows middleware to depend on those fields without having to do their own parsing.

There are two additional fields which have special meanings: `redirect` and `done`. `redirect` is self-explanatory: a middleware should skip any state object with a `redirect` field by passing it to the next middleware. Similarly, a state object with `done: true` indicates that a previous middleware has already handled it, and it needs no further processing by remaining middleware. (There are some circumstances where it may be appropriate for a middleware to process a `done` state object.)

Handling all these special cases can get tedious. The `handle()` allows you to create a middleware that handles specific cases. It's a bit like a switch statement, or pattern matching. Example

```js
import { handle } from '@acdlite/router'

const middleware = handle({
  // Handle error
  error: next => (error, state) => {...}

  // Handle redirect
  redirect: next => (error, state) => {...}

  // Handle done
  done: next => (error, state) => {...}

  // Handle all other cases
  next: next => (error, state) => {...}
})
```

`next()` is the most common handler.

If a handler is omitted, the default behavior is to pass the state object through to the next middleware, unchanged.

## Proof-of-concept: React Router-like API

As a proof-of-concept, the `react-router/` directory includes utilities for implementing a React Router-like API using middleware. It supports:

- Nested route matching, with params
- Plain object routes or JSX routes
- Asynchronous route fetching, using `config.getChildRoutes()`
- Asynchronous component fetching, using `config.getComponent()`
- Index routes

Not yet completed:

- `<Redirect>` routes

Internally, it uses several of React Router's methods, so the route matching behavior should be identical.

Example:

```js
import { createRouter } from '@acdlite/router'
import { nestedRoute, getComponents, Route, IndexRoute } from '@acdlite/router/react-router'
import createHistory from 'history/lib/createBrowserHistory'

const reactRouter = createRouter(
  nestedRoute(
    <Route path="/" component={App}>
      <Route path="post">
        <IndexRoute component={PostIndex} />
        <Route path=":id" component={Post} />
      </Route>
    </Route>
  ),
  getComponents,
  // ... add additional middleware, if desired
)

const history = createHistory()

// Listen for location updates
history.listen(location => {
  // E.g. after navigating to '/post/123'
  // Routers can accept either a path string or an object with `pathname`,
  // `query`, and `search`, so we can pass the location object directly.
  reactRouter(location, {
    // Route was successful
    done: (error, state) => {
      // Returns a state object with info about the matched routes
      expect(state).to.eql({
        params: { id: '123' },
        routes: [...] // Array of matching route config objects
        components: [App, Post], // Array of matching components
        // ...plus other fields from the location object
      })

      // Render your app using state...
    },

    // Handle redirects
    redirect: (error, state) => {
      history.replace(state.redirect)
    },

    // Handle errors
    error: error => {
      throw error
    }
  }
})
```

A key thing to note is that the server-side API is exactly the same: instead of using history, just pass a path string directly to the router, and implement `done()`, `redirect()` and `error()` as appropriate.

Also note that there's no interdependency between history and your routing logic.

The router returns the matched components, but it's up to you to render them how you like. An easy way to start is using Recompose's [`nest()`](https://github.com/acdlite/recompose/blob/master/docs/API.md#nest) function:

```js
const Component = nest(...state.components)
ReactDOM.render(<Component {...state.params} {...state.query} />)
```

That gets you 90% of the way to parity with React Router. Conveniences like the `<Link>` component and transition hooks would need to be re-implemented, but are fairly straightforward.
