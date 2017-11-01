/*eslint-disable*/
/**
 * AltNativeContainer.
 *
 * @see AltContainer
 */
import React from 'react-native'
import mixinContainer from './mixinContainer'
import assign from 'object.assign'
import createReactClass from 'create-react-class';

const AltNativeContainer = createReactClass(assign({
  displayName: 'AltNativeContainer',

  render() {
    return this.altRender(React.View)
  }
}, mixinContainer(React)))

export default AltNativeContainer
