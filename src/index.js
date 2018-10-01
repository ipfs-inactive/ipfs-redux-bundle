'use strict'
/* eslint-env browser, webextensions */

const root = require('window-or-global')
const IpfsApi = require('ipfs-api')
const multiaddr = require('multiaddr')

const defaultOptions = {
  tryWindow: true,
  tryCompanion: true,
  tryApi: true,
  tryJsIpfs: false,
  defaultApiAddress: '/ip4/127.0.0.1/tcp/5001'
}

module.exports = (opts) => {
  opts = Object.assign({}, defaultOptions, opts)

  const defaultState = {
    defaultApiAddress: opts.defaultApiAddress,
    apiAddress: getUserProvidedIpfsApi(),
    provider: null, // 'window.ipfs' || 'ipfs-companion' || 'js-ipfs-api' || 'js-ipfs'
    failed: false,
    ready: false,
    invalidAddress: false
  }

  // Throws a warning if the user wants to use js-ipfs but didn't pass an instance.
  if (opts.tryJsIpfs && !opts.getJsIpfs) {
    console.warn('When enabling tryJsIpfs, you must provide a js-ipfs instance as opts.getJsIpfs. It will be disabled for now.')
    opts.tryJsIpfs = false
  }

  let ipfs = null

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

async function getIpfs (opts, { store, getState, dispatch }) {
  dispatch({ type: 'IPFS_INIT_STARTED' })
  const { ipfsConnectionTest } = opts
  if (opts.tryCompanion) {
    const res = await tryCompanion({ root, ipfsConnectionTest })
    if (res) {
      return dispatchInitFinished(res)
    }
  }
  if (opts.tryWindow) {
    const res = await tryWindow({ root, ipfsConnectionTest })
    if (res) {
      return dispatchInitFinished(res)
    }
  }
  if (opts.tryApi) {
    const { apiAddress, defaultApiAddress } = getState().ipfs
    const { location } = root
    const res = await tryApi({apiAddress, defaultApiAddress, location, IpfsApi, ipfsConnectionTest})
    if (res) {
      return dispatchInitFinished(res)
    }
  }
  if (opts.tryJsIpfs) {
    const jsIpfsOpts = getUserOpts('ipfsOpts') || {}
    const { getJsIpfs } = opts
    const res = await tryJsIpfs({jsIpfsOpts, getJsIpfs, ipfsConnectionTest})
    if (res) {
      return dispatchInitFinished('js-ipfs', res)
    }
  }
  dispatch({ type: 'IPFS_INIT_FAILED' })
}

const dispatchInitFinished = (dispatch, res) => {
  const payload = {
    provider
  }
  if (apiAddress) {
    payload.apiAddress = apiAddress
  }
  dispatch({ type: 'IPFS_INIT_FINISHED', payload })
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

function getUserProvidedIpfsApi () {
  const ipfsApi = getUserOpts('ipfsApi')
  if (ipfsApi && !isMultiaddress(ipfsApi)) {
    console.warn(`The ipfsApi address ${ipfsApi} is invalid.`)
    return null
  }
  return ipfsApi
}
