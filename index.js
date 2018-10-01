'use strict'
/* eslint-env browser, webextensions */

const root = require('window-or-global')
const IpfsApi = require('ipfs-api')
const multiaddr = require('multiaddr')

const defaultOptions = {
  tryWindow: true,
  tryApi: true,
  tryJsIpfs: false,
  defaultApiAddress: '/ip4/127.0.0.1/tcp/5001'
}

module.exports = (opts = {}) => {
  opts = Object.assign({}, defaultOptions, opts)

  let userProvidedIpfsApi = getUserProvidedIpfsApi()
  if (userProvidedIpfsApi) {
    opts.defaultApiAddress = userProvidedIpfsApi
  }

  const defaultState = {
    apiAddress: opts.defaultApiAddress,
    identity: null,
    provider: null, // 'window.ipfs' | 'js-ipfs-api' | 'js-ipfs'
    failed: false,
    ready: false,
    invalidAddress: false
  }

  // Throws a warning if the user wants to use JS-IPFS but didn't pass an instance.
  if (opts.tryJsIpfs && !opts.getJsIpfs) {
    console.warn('When enabling tryJsIpfs, you must provide a js-ipfs instance as opts.getJsIpfs. It will be disabled for now.')
    opts.tryJsIpfs = false
  }

  let ipfs = null
  let Ipfs = null

  async function getIpfs (opts = {}, { store, getState, dispatch }) {
    dispatch({ type: 'IPFS_INIT_STARTED' })

    const dispatchInitFinished = (provider, res, apiAddress) => {
      ipfs = res.ipfs

      const payload = {
        provider,
        identity: res.identity
      }

      if (apiAddress) {
        payload.apiAddress = apiAddress
      }

      dispatch({ type: 'IPFS_INIT_FINISHED', payload })
    }

    // tries window.ipfs
    if (opts.tryWindow) {
      const res = await tryWindow()

      if (res) {
        return dispatchInitFinished('window.ipfs', res)
      }
    }

    // tries js-ipfs-api
    if (opts.tryApi) {
      const apiAddress = getState().ipfs.apiAddress
      const res = await tryApi(apiAddress)

      if (res) {
        return dispatchInitFinished('js-ipfs-api', res, apiAddress)
      }
    }

    // tries js-ipfs if enabled
    if (opts.tryJsIpfs) {
      const ipfsOpts = getUserOpts('ipfsOpts') || {}

      if (!Ipfs) {
        Ipfs = await opts.getJsIpfs()
      }

      const res = await tryJsIpfs(Ipfs, ipfsOpts)

      if (res) {
        return dispatchInitFinished('js-ipfs', res)
      }
    }

    dispatch({ type: 'IPFS_INIT_FAILED' })
  }

  return {
    name: 'ipfs',

    reducer (state, { type, payload }) {
      state = state || defaultState

      if (type === 'IPFS_INIT_STARTED') {
        return Object.assign({}, state, { ready: false })
      }

      if (type === 'IPFS_INIT_FINISHED') {
        return Object.assign({}, state, { ready: true, failed: false }, payload)
      }

      if (type === 'IPFS_STOPPED') {
        return Object.assign({}, state, { ready: false, failed: false })
      }

      if (type === 'IPFS_INIT_FAILED') {
        return Object.assign({}, state, { ready: false, failed: true })
      }

      if (type === 'IPFS_API_ADDRESS_UPDATED') {
        return Object.assign({}, state, { apiAddress: payload, invalidAddress: false })
      }

      if (type === 'IPFS_API_ADDRESS_INVALID') {
        return Object.assign({}, state, { invalidAddress: true })
      }

      if (type === 'IPFS_API_ADDRESS_INVALID_DISMISS') {
        return Object.assign({}, state, { invalidAddress: false })
      }

      return state
    },

    getExtraArgs () {
      return { getIpfs: () => ipfs }
    },

    selectIpfsReady: state => state.ipfs.ready,

    selectIpfsProvider: state => state.ipfs.provider,

    selectIpfsApiAddress: state => state.ipfs.apiAddress,

    selectIpfsInvalidAddress: state => state.ipfs.invalidAddress,

    selectIpfsInitFailed: state => state.ipfs.failed,

    selectIpfsIdentity: state => state.ipfs.identity,

    doInitIpfs: () => async (store) => {
      await getIpfs(opts, store)
    },

    doStopIpfs: () => async ({ dispatch }) => {
      ipfs.stop(() => {
        dispatch({ type: 'IPFS_STOPPED' })
      })
    },

    doUpdateIpfsApiAddress: (addr) => (store) => {
      if (!isMultiaddress(addr)) {
        store.dispatch({ type: 'IPFS_API_ADDRESS_INVALID' })
        return
      }

      saveUserOpts('ipfsApi', addr)
      store.dispatch({ type: 'IPFS_API_ADDRESS_UPDATED', payload: addr })

      getIpfs(Object.assign({}, opts, {
        tryWindow: false,
        tryJsIpfs: false
      }), store)
    },

    doDismissIpfsInvalidAddress: () => ({ dispatch }) => {
      dispatch({ type: 'IPFS_API_ADDRESS_INVALID_DISMISS' })
    }
  }
}

async function tryWindow () {
  console.log('Trying window.ipfs')

  // Opportunistic optimizations when running from ipfs-companion (+ ipfs-desktop in future)
  if (typeof chrome === 'object') {
    // Note: under some vendors getBackgroundPage() will return null if window is in incognito mode
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1329304
    const webExt = chrome.extension.getBackgroundPage()
    // If extension is ipfs-companion exposing IPFS API, use it directly for best performance
    if (webExt && webExt.ipfsCompanion && webExt.ipfsCompanion.ipfs) {
      const ipfs = webExt.ipfsCompanion.ipfs
      const identity = await ipfs.id()

      return { identity, ipfs }
    }
  }

  if (root.ipfs) {
    try {
      let identity = await root.ipfs.id()
      console.log('Found `window.ipfs`. Nice!')

      return { ipfs: root.ipfs, identity }
    } catch (error) {
      console.log('Failed to get id from window.ipfs', error)
    }
  } else {
    console.log('No window.ipfs found. Consider Installing the IPFS Companion web extension - https://github.com/ipfs-shipyard/ipfs-companion')
  }
}

async function tryApi (opts) {
  try {
    console.time('js-ipfs-api ready!')
    console.log('Trying ipfs-api', opts)

    console.info('🎛️ Customise your js-ipfs-api options by storing a `ipfsApi` object in localStorage. e.g. localStorage.setItem(\'ipfsApi\', \'/ip4/127.0.0.1/tcp/5001\')')

    const ipfs = new IpfsApi(opts)
    const identity = await ipfs.id()

    console.timeEnd('js-ipfs-api ready!')
    return { ipfs, identity }
  } catch (error) {
    console.log('No ipfs-api found', error)
  }
}

async function tryJsIpfs (Ipfs, opts) {
  try {
    console.time('js-ipfs ready!')
    console.log('Trying js-ipfs', opts)
    console.info('🎛️ Customise your js-ipfs opts by setting an `ipfsOpts` value in localStorage. e.g. localStorage.setItem(\'ipfsOpts\', JSON.stringify({relay: {enabled: true}}))')
    const ipfs = await initJsIpfs(Ipfs, opts)
    const identity = await ipfs.id()
    console.timeEnd('js-ipfs ready!')

    return { ipfs, identity }
  } catch (error) {
    console.log('Failed to initialise js-ipfs', error)
  }
}

function isMultiaddress (addr) {
  if (addr === null || addr === undefined || typeof addr === 'undefined') {
    return false
  }

  try {
    multiaddr(addr)
    return true
  } catch (_) {
    return false
  }
}

function getUserOpts (key) {
  let userOpts = null
  if (root.localStorage) {
    try {
      userOpts = root.localStorage.getItem(key)
    } catch (error) {
      console.log(`Error reading '${key}' value from localStorage`, error)
    }
    try {
      return JSON.parse(userOpts)
    } catch (_) {
      // res was probably a string, so pass it on.
      return userOpts
    }
  }
}

function saveUserOpts (key, val) {
  if (root.localStorage) {
    try {
      if (typeof val !== 'string') {
        val = JSON.stringify(val)
      }
      root.localStorage.setItem(key, val)
    } catch (error) {
      console.log(`Error writing '${key}' value to localStorage`, error)
    }
  }
}

function initJsIpfs (Ipfs, opts) {
  return new Promise((resolve, reject) => {
    const ipfs = new Ipfs(opts)
    ipfs.once('ready', () => resolve(ipfs))
    ipfs.once('error', err => reject(err))
  })
}

function getUserProvidedIpfsApi () {
  const ipfsApi = getUserOpts('ipfsApi')
  if (ipfsApi && !isMultiaddress(ipfsApi)) {
    console.warn(`The ipfsApi address ${ipfsApi} is invalid.`)
    return null
  }
  return ipfsApi
}
