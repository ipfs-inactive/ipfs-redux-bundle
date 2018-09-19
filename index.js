'use strict'
/* eslint-env browser, webextensions */

const root = require('window-or-global')
const IpfsApi = require('ipfs-api')
const multiaddr = require('multiaddr')

const defaultOptions = {
  tryWindow: true,
  tryApi: true,
  tryJsIpfs: false,
  defaultApiOpts: {
    host: '127.0.0.1',
    port: '5001',
    protocol: 'http'
  }
}

module.exports = (opts = {}) => {
  opts = Object.assign({}, defaultOptions, opts)

  const defaultState = {
    apiOpts: opts.defaultApiOpts,
    identity: null,
    provider: null, // 'window.ipfs' | 'js-ipfs-api' | 'js-ipfs'
    failed: false,
    ready: false
  }

  // Throws a warning if the user wants to use JS-IPFS but didn't pass an instance.
  if (opts.tryJsIpfs && !opts.getIpfs) {
    console.warn('When enabling tryJsIpfs, you must provide a js-ipfs instance as opts.getIpfs. It will be disabled for now.')
    opts.tryJsIpfs = false
  }

  let ipfs = null
  let Ipfs = null

  async function getIpfs (opts = {}, { getState, dispatch }) {
    dispatch({ type: 'IPFS_INIT_STARTED' })

    const dispatchInitFinished = (provider, res, apiOpts) => {
      ipfs = res.ipfs

      const payload = {
        provider,
        identity: res.identity
      }

      if (apiOpts) {
        payload.apiOpts = apiOpts
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
      let apiOpts = getState().ipfs.apiOpts

      if (typeof apiOpts === 'object' && !(apiOpts instanceof multiaddr)) {
        apiOpts = Object.assign({}, apiOpts, getUserOpts('ipfsApi'))
      }

      const res = await tryApi(apiOpts)
      if (res) {
        return dispatchInitFinished('js-ipfs-api', res, apiOpts)
      }
    }

    // tries js-ipfs if enabled
    if (opts.tryJsIpfs) {
      const ipfsOpts = getUserOpts('ipfsOpts')

      if (!Ipfs) {
        Ipfs = await opts.getIpfs()
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
        return Object.assign({}, state, { failed: false })
      }

      if (type === 'IPFS_INIT_FINISHED') {
        return Object.assign({}, state, { ready: true }, payload)
      }

      if (type === 'IPFS_STOPPED') {
        return Object.assign({}, state, { ready: false, failed: false })
      }

      if (type === 'IPFS_INIT_FAILED') {
        return Object.assign({}, state, { ready: false, failed: true })
      }

      if (type === 'IPFS_API_OPTS_UPDATED') {
        return Object.assign({}, state, { ready: false, apiOpts: payload, failed: false })
      }

      return state
    },

    getExtraArgs () {
      return { getIpfs: () => ipfs }
    },

    selectIpfsReady: state => state.ipfs.ready,

    selectIpfsProvider: state => state.ipfs.provider,

    selectIpfsApiOpts: state => state.ipfs.apiOpts,

    selectIpfsApiAddress: state => {
      const opts = state.ipfs.apiOpts

      if (typeof opts === 'string') {
        return opts
      } else if (opts instanceof multiaddr) {
        return opts.toString()
      } else {
        const ipv = opts.host.split('.').length === 4 ? 'ip4' : 'ip6'
        return `/${ipv}/${opts.host}/tcp/${opts.port}`
      }
    },

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

    doUpdateIpfsApiOpts: (usrOpts, isMultiaddress) => (store) => {
      if (!isMultiaddress) {
        saveUserOpts('ipfsApi', usrOpts)
        store.dispatch({ type: 'IPFS_API_OPTS_UPDATED', payload: usrOpts })
      } else {
        // discard user options since we're now using a multiaddress
        // this avoids overwriting the options in getIpfs
        const addr = multiaddr(usrOpts)
        saveUserOpts('ipfsApi', addr.toString())
        store.dispatch({ type: 'IPFS_API_OPTS_UPDATED', payload: addr })
      }

      getIpfs(Object.assign({}, opts, {
        tryWindow: false,
        tryJsIpfs: false
      }), store)
    },

    doUpdateIpfsApiAddress: (addr) => ({ store }) => {
      store.doUpdateIpfsApiOpts(addr, true)
    }
  }
}

async function tryWindow () {
  console.log('Trying window.ipfs')

  // Opportunistic optimizations when running from ipfs-companion (+ ipfs-desktop in future)
  if (typeof browser === 'object') {
    // Note: under some vendors getBackgroundPage() will return null if window is in incognito mode
    const webExt = await browser.runtime.getBackgroundPage()
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

    console.info('🎛️ Customise your js-ipfs-api options by storing a `ipfsApi` object in localStorage. e.g. localStorage.setItem(\'ipfsApi\', JSON.stringify({port: \'1337\'}))')

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

function getUserOpts (key) {
  let userOpts = null
  if (root.localStorage) {
    try {
      const optsStr = root.localStorage.getItem(key) || '{}'
      userOpts = JSON.parse(optsStr)
    } catch (error) {
      console.log(`Error reading '${key}' value from localStorage`, error)
    }
  }
  return userOpts
}

function saveUserOpts (key, val) {
  if (root.localStorage) {
    try {
      root.localStorage.setItem(key, JSON.stringify(val))
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
