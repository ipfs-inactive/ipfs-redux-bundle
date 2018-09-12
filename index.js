'use strict'
/* eslint-env browser, webextensions */

const root = require('window-or-global')
const IpfsApi = require('ipfs-api')

const defaultState = {
  apiOpts: {
    host: '127.0.0.1',
    port: '5001',
    protocol: 'http'
  },
  identity: null,
  provider: null, // 'window.ipfs' | 'js-ipfs-api' | 'js-ipfs'
  failed: false,
  ready: false
}

module.exports = (opts = {}) => {
  opts.tryWindow = opts.tryWindow || true
  opts.tryApi = opts.tryApi || true
  opts.tryJsIpfs = opts.tryJsIpfs || false

  // Throws a warning if the user wants to use JS-IPFS but didn't pass an instance.
  if (opts.tryJsIpfs && !opts.Ipfs) {
    console.warn('When enabling tryJsIpfs, you must provide a js-ipfs instance as opts.Ipfs. It will be disabled for now.')
    opts.tryJsIpfs = false
  }

  let ipfs = null

  async function getIpfs (opts = {}, { getState, dispatch }) {
    dispatch({ type: 'IPFS_INIT_STARTED' })

    const leave = (payload) => {
      if (payload.ipfs) {
        ipfs = payload.ipfs
        delete payload.ipfs
      }

      dispatch({type: 'IPFS_INIT_FINISHED', payload})
    }

    // tries window.ipfs
    if (opts.tryWindow) {
      const res = await tryWindow()
      if (res) {
        return leave({
          ...res,
          provider: 'window.ipfs'
        })
      }
    }

    // tries js-ipfs-api
    if (opts.tryApi) {
      let apiOpts = getState().ipfs.apiOpts

      if (typeof apiOpts === 'object') {
        apiOpts = Object.assign({}, apiOpts, getUserOpts('ipfsApi'))
      }

      const res = await tryApi(apiOpts)

      if (res) {
        return leave({
          ...res,
          provider: 'js-ipfs-api',
          apiOpts
        })
      }
    }

    // tries js-ipfs if enabled
    if (opts.tryJsIpfs) {
      const ipfsOpts = getUserOpts('ipfsOpts')
      const res = await tryJsIpfs(opts.Ipfs, ipfsOpts)

      if (res) {
        return leave({
          ...res,
          provider: 'js-ipfs'
        })
      }
    }

    dispatch({ type: 'IPFS_INIT_FAILED' })
  }

  return {
    name: 'ipfs',

    reducer (state, {type, payload}) {
      state = state || defaultState

      if (type === 'IPFS_INIT_STARTED') {
        return Object.assign({}, state, { failed: false })
      }

      if (type === 'IPFS_INIT_FINISHED') {
        return Object.assign({}, state, { ready: true, ...payload })
      }

      if (type === 'IPFS_INIT_FAILED') {
        return Object.assign({}, state, { ready: false, failed: true })
      }

      if (type === 'IPFS_API_UPDATED') {
        return Object.assign({}, state, { ready: false, apiOpts: payload, failed: false })
      }

      return state
    },

    getExtraArgs () {
      return { getIpfs: () => ipfs }
    },

    selectIpfsReady: state => state.ipfs.ready,

    selectIpfsProvider: state => state.ipfs.provider,

    selectIpfsApiAddress: state => state.ipfs.apiAddress,

    selectIpfsInitFailed: state => state.ipfs.failed,

    selectIpfsIdentity: state => state.ipfs.identity,

    doInitIpfs: () => async (store) => {
      getIpfs(opts, store)
    },

    doUpdateIpfsApiOpts: (opts) => (store) => {
      store.dispatch({ type: 'IPFS_API_UPDATED', payload: opts })
      saveUserOpts('ipfsApi', opts)

      getIpfs(Object.assign({}, opts, {
        tryWindow: false,
        tryJsIpfs: false
      }), store)
    }
  }
}

async function tryApi (opts) {
  try {
    console.time('IPFS_INIT_API')
    console.log('Trying ipfs-api', opts)

    console.info('🎛️ Customise your js-ipfs-api options by setting:')
    console.info('\t1. an address in the URL with `ipfsApi` param. e.g. ?ipfsApi=/ip4/127.0.0.1/tcp/5001')
    console.info('\t2. a `ipfsApi` value in localStorage. e.g. localStorage.setItem(\'ipfsApi\', JSON.stringify({port: \'1337\'}))')

    const ipfs = new IpfsApi(opts)
    const identity = await ipfs.id()

    console.log('js-ipfs-api ready!')
    console.timeEnd('IPFS_INIT_API')
    return { ipfs, identity }
  } catch (error) {
    console.log('No ipfs-api found', error)
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

async function tryJsIpfs (Ipfs, opts) {
  try {
    console.time('IPFS_INIT_JS_IPFS')
    console.log('Trying js-ipfs', opts)
    console.info('🎛️ Customise your js-ipfs opts by setting an `ipfsOpts` value in localStorage. e.g. localStorage.setItem(\'ipfsOpts\', JSON.stringify({relay: {enabled: true}}))')
    const ipfs = await initJsIpfs(Ipfs, opts)
    const identity = await ipfs.id()
    console.log('js-ipfs ready!')
    console.timeEnd('IPFS_INIT_JS_IPFS')

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
