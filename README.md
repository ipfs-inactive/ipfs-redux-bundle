# ipfs-redux-bundle

> A [redux bundle](https://reduxbundler.com/) to create an IPFS instance and pass it as an `extraArg` to other store methods.

[![](https://img.shields.io/badge/project-IPFS-blue.svg)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg)](http://webchat.freenode.net/?channels=%23ipfs) [![Build Status](https://travis-ci.org/ipfs-shipyard/ipfs-redux-bundle.svg?branch=master)](https://travis-ci.org/ipfs-shipyard/ipfs-redux-bundle)

See https://reduxbundler.com for more info on the wonders of redux bundles.

This will try to use `window.ipfs` from [IPFS Companion](https://github.com/ipfs-shipyard/ipfs-companion). If not available, tries to connect to `js-ipfs-api`. The developer can also enable `js-ipfs` as a fallback.

## Usage

Add `ipfs-redux-bundle` to your store

**bundles/index.js**

```js
import { composeBundles } from 'redux-bundler'
import ipfsBundle from 'ipfs-redux-bundle'
// ... import other bundles

export default composeBundles(
  ipfsBundle({
    // These are the defaults:
    tryWindow: true,      // set false to bypass window.ipfs verification
    tryApi: true,         // set false to bypass js-ipfs-api verification. Uses data from ipfsApi variable in localStorage
    tryJsIpfs: false,     // set true to attempt js-ipfs initialisation.
    Ipfs: null            // must be set to a js-ipfs instance if tryJsIpfs is true.
  })
  // ... add bundles here
)
```

In your app, you can now `connect` up the `doInitIpfs` function. Here we init IPFS when our root component mounts:

**App.js**

```js
import React, { Component } from 'react'
import { connect } from 'redux-bundler-react'

export class App extends Component {
  componentDidMount () {
    this.props.doInitIpfs()
  }
  render () {
    // ipfs-css powered gorgeous ui here.
  }
}

export default connect(
  'doInitIpfs',
  App
)
```

## API

Adds the following methods to the redux store.

#### `store.selectIpfsReady()`

- `boolean` - Is the IPFS instance ready to use yet?.

#### `store.selectIpfsInitFailed()`

- `boolean` - Did the IPFS instance fail to start?.

#### `store.selectIpfsIdentity()`

- `Object` - The last resolved value of `ipfs.id()`.

#### `store.selectIpfsProvider()`

- `string` - Can be `window.ipfs`, `js-ipfs-api` or `js-ipfs`.

#### `store.selectIpfsApiOpts()`

- `string` - The API options of the IPFS instance.

#### `store.doInitIpfs()`

- Create a new IPFS instance. This will `window.ipfs` if you have [IPFS Companion](https://github.com/ipfs-shipyard/ipfs-companion) installed, or a [`js-ipfs-api`](https://github.com/ipfs/js-ipfs-api) instance otherwise.

#### `store.doStopIpfs()`

- Stops the IPFS instance. It is only intended to use with `js-ipfs`.

### `store.doUpdateIpfsApiOpts(opts)`

- Updates the API Options to `opts`. This will **overwrite** any configuration you have now and it will only try `js-ipfs-api`.

## Contribute

Feel free to dive in! [Open an issue](https://github.com/ipfs-shipyard/ipfs-redux-bundle/issues/new) or submit PRs.

## License

[MIT](LICENSE) © Protocol Labs
