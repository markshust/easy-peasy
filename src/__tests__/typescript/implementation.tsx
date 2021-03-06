import * as React from 'react'
import * as ReactDOM from 'react-dom'
import {
  createStore,
  effect,
  listeners,
  reducer,
  select,
  StoreProvider,
  useAction,
  useStore,
  Action,
  Dispatch,
  Effect,
  Listeners,
  Reducer,
  Select,
  State,
} from 'easy-peasy'
import { connect } from 'react-redux'

/**
 * Firstly you define your Model
 */

interface Injections {
  appId: string
}

interface TodosModel {
  items: Array<string>
  firstItem: Select<TodosModel, string | void>
  addTodo: Action<TodosModel, string>
}

interface UserModel {
  token?: string
  loggedIn: Action<UserModel, string>
  login: Effect<Model, { username: string; password: string }>
}

interface AuditModel {
  logs: string[]
  set: Action<AuditModel, string>
  userListeners: Listeners<Model>
  getNLog: Select<AuditModel, (n: number) => string | undefined>
}

interface Model {
  todos: TodosModel
  user: UserModel
  counter: Reducer<number>
  printDebugInfo: Effect<Model, void, Injections, Promise<string>>
  sayHello: Effect<Model, void, Injections>
  audit: AuditModel
}

/**
 * Then you create your store.
 * Note that as we pass the Model into the `createStore` function, so all of our
 * model definition is typed correctly, including inside the actions/helpers etc.
 */
const store = createStore<Model>({
  audit: {
    logs: [],
    set: (state, payload) => {
      state.logs.push(payload)
    },
    userListeners: listeners((actions, attach) => {
      attach(actions.user.login, (dispatch, payload) => {
        dispatch.audit.set(`Logging in ${payload.username}`)
      })
    }),
    getNLog: select(state => (n: number) =>
      state.logs.length > n ? state.logs[n] : undefined,
    ),
  },
  todos: {
    items: [],
    firstItem: select(state =>
      state.items.length > 0 ? state.items[0] : undefined,
    ),
    addTodo: (state, payload) => {
      state.items.push(payload)
    },
  },
  user: {
    token: undefined,
    loggedIn: (state, payload) => {
      state.token = payload
    },
    login: effect(async (dispatch, payload) => {
      const response = await fetch('/login', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const { token } = await response.json()
      dispatch.user.loggedIn(token)
    }),
  },
  counter: reducer((state = 0, action) => {
    switch (action.type) {
      case 'COUNTER_INCREMENT':
        return state + 1
      default:
        return state
    }
  }),
  printDebugInfo: effect(async (state, payload, getState, injections) => {
    const msg = `App id: ${injections.appId}`
    console.log(msg)
    return msg
  }),
  sayHello: effect(() => {
    console.log('Hello world')
  }),
})

/**
 * You can use the "standard" store APIs
 */

console.log(store.getState().todos.firstItem)

store.dispatch({ type: 'COUNTER_INCREMENT' })

store.dispatch.todos.addTodo('jello')
store.dispatch.printDebugInfo()

const log1 = store.getState().audit.getNLog(1)

if (log1) {
  const logconcat = 'Debug ' + log1
  console.log(logconcat)
}

/**
 * You can access state via hooks
 */
function MyComponent() {
  const token = useStore((state: State<Model>) => state.user.token)
  const { login, printDebugInfo, sayHello } = useAction(
    (dispatch: Dispatch<Model>) => ({
      login: dispatch.user.login,
      printDebugInfo: dispatch.printDebugInfo,
      sayHello: dispatch.sayHello,
    }),
  )
  printDebugInfo().then(result => {
    console.log(result + 'should_be_string')
  })
  sayHello().then(() => {
    console.log('Goodbye')
  })
  return (
    <button onClick={() => login({ username: 'foo', password: 'bar' })}>
      {token || 'Log in'}
    </button>
  )
}

/**
 * Expose the store to your app as normal
 */

ReactDOM.render(
  <StoreProvider store={store}>
    <MyComponent />
  </StoreProvider>,
  document.createElement('div'),
)

/**
 * We also support typing react-redux
 */

const Counter: React.SFC<{ counter: number }> = ({ counter }) => (
  <div>{counter}</div>
)

connect((state: State<Model>) => ({
  counter: state.counter,
}))(Counter)
