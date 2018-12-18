# ipfs-redux-bundle

> A [redux bundle](https://reduxbundler.com/) to create an IPFS instance and pass it as an `extraArg` to other store methods.

[![](https://img.shields.io/badge/project-IPFS-blue.svg)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg)](http://webchat.freenode.net/?channels=%23ipfs) [![Build Status](https://travis-ci.org/ipfs-shipyard/ipfs-redux-bundle.svg?branch=master)](https://travis-ci.org/ipfs-shipyard/ipfs-redux-bundle)

See https://reduxbundler.com for more info on the wonders of redux bundles.

This module tries to connect to IPFS via multiple providers, in order:

- `ipfs-companion` the IPFS instance from [IPFS Companion](https://github.com/ipfs-shipyard/ipfs-companion) directly.
- `window.ipfs` in the current page via [IPFS Companion](https://github.com/ipfs-shipyard/ipfs-companion).
- `js-ipfs-http-client` with either a user provided `apiAddress`, the current origin, or the default `/ip4/127.0.0.1/tcp/5001` address.
- `js-ipfs` **disabled by default**. Pass `tryJsIpfs: true, getJsIpfs: () => Promise` to enable it. See [Enable js-ipfs](#enable-js-ipfs)

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
    tryCompanion: true,   // set false to bypass ipfs-companion verification
    tryWindow: true,      // set false to bypass window.ipfs verification
    tryApi: true,         // set false to bypass js-ipfs-http-client verification. Uses data from ipfsApi variable in localStorage
    tryJsIpfs: false,     // set true to attempt js-ipfs initialisation.
    getJsIpfs: null       // must be set to a js-ipfs instance if tryJsIpfs is true.
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

### Enable js-ipfs

To enable js-ipfs, intialise the bundle with the following opts

```js
  ipfsBundle({
    tryJsIpfs: true,
    getJsIpfs: () => import('ipfs')
  })
```

- `tryJsIpfs` should be set to `true`
- `getJsIpfs` should be a function that returns a promise that resolves with a `JsIpfs` constructor. This works well with [dynamic `import()`](https://developers.google.com/web/updates/2017/11/dynamic-import), so you can lazily load js-ipfs when it is needed.

## API

Adds the following methods to the redux store.

#### `store.selectIpfsReady()`

- `boolean` - Is the IPFS instance ready to use yet?

#### `store.selectIpfsInitFailed()`

- `boolean` - Did the IPFS instance fail to start?

#### `store.selectIpfsInvalidAddress()`

- `boolean` - Is the last API Address you tried to use invalid?

#### `store.selectIpfsIdentity()`

- `Object` - The last resolved value of `ipfs.id()`.

#### `store.selectIpfsProvider()`

- `string` - Can be `window.ipfs`, `js-ipfs-api` or `js-ipfs`.

#### `store.selectIpfsApiAddress()`

- `string` - The API address of the IPFS instance.

#### `store.doInitIpfs()`

- Create a new IPFS instance. This will `window.ipfs` if you have [IPFS Companion](https://github.com/ipfs-shipyard/ipfs-companion) installed, or a [`js-ipfs-http-client`](https://github.com/ipfs/js-ipfs-http-client) instance otherwise.

#### `store.doStopIpfs()`

- Stops the IPFS instance. It is only intended to use with `js-ipfs`.

#### `store.doUpdateIpfsApiAddress(address)`

- Updates the API Address to `address`.

#### `store.doDismissIpfsInvalidAddress()`

- Dismisses the invalid address error.

## Contribute

Feel free to dive in! [Open an issue](https://github.com/ipfs-shipyard/ipfs-redux-bundle/issues/new) or submit PRs.

## License

[MIT](LICENSE) © Protocol Labs
