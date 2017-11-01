import { jsdom } from 'jsdom'
import Alt from 'alt'
import React from 'react'
import PropTypes from 'prop-types';
import AltContainer from '../'
import { assert } from 'chai'
import sinon from 'sinon'
import TestUtils from 'react-dom/test-utils'
import ReactDom from 'react-dom'
import createReactClass from 'create-react-class';

const alt = new Alt()

const action = alt.generateActions('sup')

const withAltContext = function (flux) {
  return function (Component) {
    return createReactClass({
      childContextTypes: {
        flux: PropTypes.object
      },

      getChildContext: function getChildContext() {
        return { flux: flux };
      },

      render: function render() {
        return React.createElement(Component, this.props);
      }
    });
  };
};

const TestStore = alt.createStore({
  displayName: 'TestStore',

  bindListeners: {
    handleSup: action.sup
  },

  state: { x: null },

  handleSup(x) {
    this.setState({ x })
  }
})

const Store2 = alt.createStore({
  displayName: 'Store2',

  bindListeners: {
    onSup: action.sup
  },

  state: { y: null },

  onSup(y) {
    this.setState({ y })
  }
})

class Flux extends Alt {
  constructor() {
    super()

    this.addActions('testActions', function () {
      this.generateActions('test')
    })

    this.addStore('testStore', {
      bindListeners: {
        test: this.getActions('testActions').test
      },

      state: { x: null },

      test(x) {
        this.setState({ x })
      }
    })
  }
}

const SpyComponent = createReactClass({
  render() {
    return null;
  }
});

export default {
  'AltContainer': {
    beforeEach() {
      global.document = jsdom('<!doctype html><html><body></body></html>')
      global.window = global.document.defaultView

      alt.recycle()
    },

    afterEach() {
      delete global.document
      delete global.window
    },

    'element mounts and unmounts'() {
      const div = document.createElement('div')
      ReactDom.render(
        <AltContainer>
          <SpyComponent />
        </AltContainer>
      , div)

      ReactDom.unmountComponentAtNode(div)
    },

    'many elements mount'() {
      TestUtils.renderIntoDocument(
        <AltContainer>
          <SpyComponent />
          <SpyComponent />
          <SpyComponent />
          <SpyComponent />
        </AltContainer>
      )
    },

    'element has correct state'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer stores={{ TestStore }}>
          <SpyComponent />
        </AltContainer>
      )

      action.sup('hello')

      assert(node.state.TestStore.x === 'hello')

      action.sup('bye')

      assert(node.state.TestStore.x === 'bye')
    },

    'works with context'() {
      const flux = new Flux()

      @withAltContext(flux)
      class ContextComponent extends React.Component {
        render() {
          return <AltContainer />
        }
      }

      const tree = TestUtils.renderIntoDocument(<ContextComponent />)

      const contextComponent = TestUtils.findRenderedComponentWithType(
        tree,
        AltContainer
      )

      assert.instanceOf(contextComponent.context.flux, Flux)
    },

    'children get flux as props with context'() {
      const flux = new Flux()

      const TestComponent = createReactClass({
        render() {
          return (
            <AltContainer>
              <div>
                <div>
                  <AltContainer>
                    <SpyComponent />
                  </AltContainer>
                </div>
              </div>
            </AltContainer>
          )
        }
      })

      const WrappedComponent = withAltContext(flux)(TestComponent)

      const node = TestUtils.renderIntoDocument(<WrappedComponent />)
      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert.instanceOf(spy.props.flux, Flux)
    },

    'works with instances and props'() {
      const flux = new Flux()

      const node = TestUtils.renderIntoDocument(
        <AltContainer flux={flux}>
          <SpyComponent />
        </AltContainer>
      )

      assert.instanceOf(node.props.flux, Flux, 'component gets flux prop')
    },

    'children have the flux prop'() {
      const flux = new Flux()

      const node = TestUtils.renderIntoDocument(
        <AltContainer flux={flux}>
          <SpyComponent />
        </AltContainer>
      )

      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert.instanceOf(spy.props.flux, Flux)
    },

    'flux prop works with the transform function'() {
      const flux = new Flux()

      const ParentSpyComponent = createReactClass({
        render() {
          return this.props.children;
        }
      })

      const TestComponent = createReactClass({
        render() {
          return (
            <AltContainer transform={({ flux }) => { return { flx: flux } }}>
              <ParentSpyComponent>
                <div>
                  <AltContainer>
                    <SpyComponent />
                  </AltContainer>
                </div>
              </ParentSpyComponent>
            </AltContainer>
          )
        }
      })

      const WrappedComponent = withAltContext(flux)(TestComponent);

      const node = TestUtils.renderIntoDocument(<WrappedComponent />)
      const parent  = TestUtils.findRenderedComponentWithType(node, ParentSpyComponent)
      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert(parent.props.flx === flux)
      assert.isUndefined(spy.props.flx)
      assert(spy.props.flux === flux)
    },

    'children get the state via props'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer stores={{ TestStore }}>
          <SpyComponent />
        </AltContainer>
      )

      action.sup('foobar')

      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert(spy.props.TestStore.x === 'foobar')
    },

    'many children get state via props'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer stores={{ TestStore }}>
          <SpyComponent />
          <SpyComponent />
          <SpyComponent />
        </AltContainer>
      )

      action.sup('foobar')

      const spies = TestUtils.scryRenderedComponentsWithType(node, SpyComponent)

      assert(spies[0].props.TestStore.x === 'foobar')
      assert(spies[1].props.TestStore.x === 'foobar')
      assert(spies[2].props.TestStore.x === 'foobar')
    },

    'passing in other props'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer className="no" stores={{ TestStore }}>
          <SpyComponent className="hello" />
        </AltContainer>
      )

      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert(spy.props.className === 'hello')
      assert.isUndefined(spy.props.stores)
    },

    'does not wrap if it does not have to'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer>
          <span />
        </AltContainer>
      )

      assert(node.props.children.type === 'span', 'single node does not wrap')

      const many = TestUtils.renderIntoDocument(
        <AltContainer>
          <span />
          <span />
        </AltContainer>
      )

      assert.ok(Array.isArray(many.props.children), 'multiple nodes are wrapped')
    },

    'passing in a single store'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer store={TestStore}>
          <SpyComponent />
        </AltContainer>
      )
      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      action.sup('just testing')

      assert(spy.props.x === 'just testing')
    },

    'pass in single function'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer store={() => {
          return {
            store: TestStore,
            value: { x: 'jesting' }
          }
        }}>
          <SpyComponent />
        </AltContainer>
      )
      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert(spy.props.x === 'jesting')
    },

    'function is called with props'() {
      const storeFunction = sinon.stub()
      storeFunction.returns({
        store: TestStore,
        value: {}
      })

      TestUtils.renderIntoDocument(
        <AltContainer className="foo" store={storeFunction}>
          <SpyComponent />
        </AltContainer>
      )

      assert.ok(storeFunction.calledThrice, 'called thrice, once for store listening and another for props, to compare changed props')
      assert(storeFunction.args[0].length === 1, 'called with one parameter')
      assert(storeFunction.args[1].length === 1, 'called with one parameter')
      assert.isObject(storeFunction.args[0][0], 'called with the props')
      assert.isObject(storeFunction.args[1][0], 'called with the props')
      assert(storeFunction.args[0][0].className === 'foo', 'props match')
      assert(storeFunction.args[1][0].className === 'foo', 'props match')
    },

    'pass in key-value of functions'() {
      const Functions = {
        x() {
          return {
            store: TestStore,
            value: { a: 'hello' }
          }
        },
        y() {
          return {
            store: TestStore,
            value: { b: 'goodbye' }
          }
        }
      }

      const node = TestUtils.renderIntoDocument(
        <AltContainer stores={Functions}>
          <SpyComponent />
        </AltContainer>
      )
      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert(spy.props.x.a === 'hello')
      assert(spy.props.y.b === 'goodbye')
    },

    'nested components pass down flux'() {
      const flux = new Flux()
      const node = TestUtils.renderIntoDocument(
        <AltContainer flux={flux}>
          <AltContainer>
            <SpyComponent />
          </AltContainer>
        </AltContainer>
      )
      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert.instanceOf(spy.props.flux, Flux)
    },

    'custom rendering'() {
      const render = sinon.stub()
      render.onCall(0).returns(null)
      TestUtils.renderIntoDocument(
        <AltContainer render={render} />
      )

      assert.ok(render.calledOnce, 'render was called')

      const node = TestUtils.renderIntoDocument(
        <AltContainer
          stores={{TestStore}}
          render={(props) => {
            assert.isDefined(props.TestStore, 'test store exists in props')
            return <span className="testing testing" />
          }}
        />
      )
      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')
      assert(span.className === 'testing testing')
    },

    'define both stores and store'() {
      assert.throws(() => {
        TestUtils.renderIntoDocument(
          <AltContainer stores={{}} store={TestStore} />
        )
      })
    },

    'changing an already mounted components props'() {
      let cb = null

      const El = createReactClass({
        getInitialState() {
          return { store: TestStore }
        },

        componentDidMount() {
          cb = state => this.setState(state)
        },

        render() {
          return (
            <AltContainer ref="test" store={this.state.store}>
              <span />
            </AltContainer>
          )
        }
      })

      const node = TestUtils.renderIntoDocument(<El />)

      assert(node.refs.test.props.store === TestStore, 'node gets first state')

      cb({ store: Store2 })

      assert(node.refs.test.props.store === Store2, 'node changes props properly')
    },

    'inject actions'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer actions={{ MyActions: action }}>
          <SpyComponent />
        </AltContainer>
      )

      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert.isObject(spy.props.MyActions, 'MyActions exist')
      assert(spy.props.MyActions === action, 'MyActions is injected actions')
      assert.isFunction(spy.props.MyActions.sup, 'sup action is available')
    },

    'inject all actions directly shorthand'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer actions={action}>
          <SpyComponent />
        </AltContainer>
      )

      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert.isFunction(spy.props.sup, 'sup is available directly on the props')
    },

    'inject all actions using a function'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer actions={function (props) {
          return {
            FooActions: {
              sup: action.sup.bind(action)
            }
          }
        }}>
          <SpyComponent />
        </AltContainer>
      )

      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert.isObject(spy.props.FooActions, 'actions are injected')
      assert.isFunction(spy.props.FooActions.sup, 'sup is available')
    },

    'scu'() {
      const scu = sinon.stub().returns(true)

      const node = TestUtils.renderIntoDocument(
        <AltContainer shouldComponentUpdate={scu} store={TestStore}>
          <span />
        </AltContainer>
      )

      action.sup()
      assert.ok(scu.calledOnce, 'custom shouldComponentUpdate was called')
      assert(scu.args[0].length === 3, '3 args are passed, the nextProps, nextState, and this.getProps()')
      assert.isDefined(scu.args[0][0].x, 'x prop exists')
    },

    'injectables'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer stores={[TestStore]} inject={{
          className: 'foo',
          foo: function () {
            return TestStore.getState()
          }
        }}>
          <SpyComponent />
        </AltContainer>
      )

      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert(spy.props.className === 'foo', 'you can inject custom things')
      assert.isDefined(spy.props.foo.x, 'functions are ran')

      action.sup(888)

      assert(spy.props.foo.x === 888, 'when passing stores as Array they are just listened on')
    },

    'passing in a component as a prop'() {
      const App = createReactClass({
        render() {
          return <SpyComponent x={this.props.x} />
        }
      })

      const node = TestUtils.renderIntoDocument(
        <AltContainer store={TestStore} component={App} />
      )

      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      action.sup(1337)

      assert.isDefined(spy, 'component exists')
      assert(spy.props.x === 1337, 'and we have props from TestStore')
    },

    'nested components and context'() {
      const flux = new Flux()

      const View = createReactClass({
        render() {
          return <SubView />
        }
      })

      const SubView = createReactClass({ render() {
        return (
          <AltContainer>
            <InsideComponent />
          </AltContainer>
        )
      } })

      const InsideComponent = createReactClass({
        render() {
          return <SpyComponent flux={this.props.flux} />
        }
      })

      const foo = sinon.spy()

      const App = createReactClass({
        render() {
          return (
            <AltContainer flux={flux} onMount={foo}>
              <View />
            </AltContainer>
          )
        }
      })

      const node = TestUtils.renderIntoDocument(<App />)
      const spy = TestUtils.findRenderedComponentWithType(node, SpyComponent)

      assert.instanceOf(spy.props.flux, Flux)

      assert.ok(foo.calledOnce, 'onMount hook was called')
    },
  }
}
